-- ============================================================
-- Huishoudens (gedeeld gezinsbudget), rollen (owner/editor/viewer),
-- uitnodigingen, en RLS die dit ook effectief afdwingt.
--
-- ⚠️  VOOR JE DIT DRAAIT: neem een volledige backup (pg_dump of via
-- Supabase Dashboard → Database → Backups). Dit is een structurele,
-- onomkeerbare wijziging aan bestaande tabellen. Draai dit in de SQL
-- Editor als één geheel (de hele "begin ... commit" hieronder) zodat
-- het atomisch is: lukt er iets niet, dan wordt alles teruggedraaid.
--
-- Optioneel, ter controle vooraf (rijaantallen), voer dit EERST apart
-- uit en noteer de aantallen:
--   select count(*) from gebruikers;
--   select count(*) from inkomen;
--   select count(*) from vaste_kosten;
--   select count(*) from facturen;
--   select count(*) from extra_uitgaven;
--   select count(*) from doelen;
--   select count(*) from investeringen;
--   select count(*) from dashboard_maanden;
-- Na de migratie moeten diezelfde aantallen terug te vinden zijn in
-- de bijhorende tabellen (nu met een household_id erbij) — zie de
-- controle-query's helemaal onderaan dit bestand.
--
-- Rollback: 0018_huishoudens_rollback.sql (enkel bruikbaar zolang er
-- nog geen tweede huishouden is aangemaakt).
-- ============================================================

begin;

-- ============================================================
-- 0. Privé-schema voor interne RLS-helpers — NIET via de API
-- aanspreekbaar (PostgREST exposeert enkel het "public"-schema).
-- ============================================================
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ============================================================
-- 1. profiles (hernoemd van "gebruikers"). Geen globale rol meer:
-- rechten zijn voortaan altijd per huishouden (household_members.role).
-- ============================================================
alter table gebruikers rename to profiles;
alter table profiles rename column id to user_id;
alter table profiles add column avatar_color text not null default '#6366F1';
alter table profiles drop column rol;

alter table profiles enable row level security;
revoke all on profiles from anon;
drop policy if exists profiles_select_self on profiles;
create policy profiles_select_self on profiles
  for select using (user_id = auth.uid());
drop policy if exists profiles_select_huisgenoten on profiles;
create policy profiles_select_huisgenoten on profiles
  for select using (
    exists (
      select 1 from household_members hm1
      join household_members hm2 on hm1.household_id = hm2.household_id
      where hm1.user_id = auth.uid() and hm2.user_id = profiles.user_id
    )
  );
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 2. households
-- ============================================================
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'EUR',
  require_approval boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft-delete: 7 dagen bedenktijd voor een definitieve, harde
  -- verwijdering (die apart/extern gebeurt, buiten de API om).
  deleted_at timestamptz
);
create trigger trg_households_updated_at before update on households
  for each row execute function set_updated_at();
alter table households enable row level security;
revoke all on households from anon;

-- ============================================================
-- 3. household_members
-- ============================================================
create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  display_name text,
  joined_at timestamptz not null default now(),
  invited_by uuid references auth.users(id),
  primary key (household_id, user_id)
);
create index household_members_user_id_idx on household_members (user_id);
-- Precies één owner per household: een tweede insert/update met role='owner'
-- voor hetzelfde household_id botst op deze index.
create unique index household_members_one_owner_idx on household_members (household_id) where role = 'owner';
alter table household_members enable row level security;
revoke all on household_members from anon;

-- ============================================================
-- 4. household_invites — nooit de ruwe token opslaan, enkel de hash.
-- ============================================================
create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('editor', 'viewer')),
  email text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz
);
create index household_invites_household_id_idx on household_invites (household_id);
alter table household_invites enable row level security;
revoke all on household_invites from anon;

-- Rate limiting op accept-pogingen (per IP-hash + per account), en op
-- het aanmaken van uitnodigingen — bijgehouden server-side, nooit
-- client-toegankelijk.
create table invite_pogingen (
  id bigint generated always as identity primary key,
  ip_hash text,
  gebruiker_id uuid references auth.users(id),
  soort text not null check (soort in ('accept', 'aanmaken')),
  gelukt boolean not null,
  created_at timestamptz not null default now()
);
create index invite_pogingen_ip_idx on invite_pogingen (ip_hash, created_at desc);
create index invite_pogingen_gebruiker_idx on invite_pogingen (gebruiker_id, created_at desc);
alter table invite_pogingen enable row level security;
revoke all on invite_pogingen from anon, authenticated;

-- ============================================================
-- 5. activity_log — append-only.
-- ============================================================
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);
create index activity_log_household_id_idx on activity_log (household_id, created_at desc);
alter table activity_log enable row level security;
revoke all on activity_log from anon;

-- ============================================================
-- 6. RLS-helperfuncties — SECURITY DEFINER + vaste search_path,
-- eigendom van de migratierol (die de tabellen ook bezit), waardoor
-- ze RLS op household_members zelf overslaan zonder recursie-lus.
-- Enkel bruikbaar in policy-expressies, niet via de API.
-- ============================================================
create or replace function private.is_member(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid()
  );
$$;

create or replace function private.can_edit(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and role in ('owner', 'editor')
  );
$$;

create or replace function private.is_owner(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function private.is_member(uuid) from public, anon, authenticated;
revoke all on function private.can_edit(uuid) from public, anon, authenticated;
revoke all on function private.is_owner(uuid) from public, anon, authenticated;

-- ============================================================
-- 7. households / household_members / household_invites / activity_log policies
-- ============================================================
drop policy if exists households_select on households;
create policy households_select on households
  for select using (private.is_member(id) and deleted_at is null);

drop policy if exists households_update_owner on households;
create policy households_update_owner on households
  for update using (private.is_owner(id)) with check (private.is_owner(id));
-- Geen directe INSERT/DELETE-policy: aanmaken gaat via create_household(),
-- verwijderen via soft-delete (UPDATE deleted_at) door de owner, en hard-
-- delete gebeurt buiten de API om na de bedenktijd.

drop policy if exists household_members_select on household_members;
create policy household_members_select on household_members
  for select using (private.is_member(household_id));

drop policy if exists household_members_update_owner on household_members;
create policy household_members_update_owner on household_members
  for update using (private.is_owner(household_id)) with check (private.is_owner(household_id));

drop policy if exists household_members_delete on household_members;
create policy household_members_delete on household_members
  for delete using (private.is_owner(household_id) or user_id = auth.uid());
-- Geen directe INSERT-policy: lid worden gaat altijd via accept_invite()
-- of create_household(), nooit via een rechtstreekse insert.

drop policy if exists household_invites_select on household_invites;
create policy household_invites_select on household_invites
  for select using (private.is_owner(household_id));

drop policy if exists household_invites_insert on household_invites;
create policy household_invites_insert on household_invites
  for insert with check (private.is_owner(household_id) and created_by = auth.uid());

drop policy if exists household_invites_update on household_invites;
create policy household_invites_update on household_invites
  for update using (private.is_owner(household_id)) with check (private.is_owner(household_id));

drop policy if exists activity_log_select on activity_log;
create policy activity_log_select on activity_log
  for select using (private.is_member(household_id));

drop policy if exists activity_log_insert on activity_log;
create policy activity_log_insert on activity_log
  for insert with check (private.can_edit(household_id) and (actor_id = auth.uid() or actor_id is null));

-- ============================================================
-- 8. Laatste-owner-bescherming: geen enkele actie (UPDATE weg van
-- 'owner', of DELETE van de owner-rij) mag een household zonder
-- owner achterlaten.
-- ============================================================
create or replace function private.bescherm_laatste_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (TG_OP = 'DELETE' and OLD.role = 'owner')
     or (TG_OP = 'UPDATE' and OLD.role = 'owner' and NEW.role <> 'owner') then
    if not exists (
      select 1 from household_members
      where household_id = OLD.household_id and role = 'owner' and user_id <> OLD.user_id
    ) then
      raise exception 'Een huishouden moet minstens één eigenaar behouden.';
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_bescherm_laatste_owner
  before update or delete on household_members
  for each row execute function private.bescherm_laatste_owner();

-- ============================================================
-- 9. Generieke triggers voor alle budgettabellen: household_id
-- onveranderbaar na insert, en created_by/updated_by/version
-- altijd server-side gezet (nooit vanuit de client).
-- ============================================================
create or replace function private.voorkom_household_wissel()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if NEW.household_id <> OLD.household_id then
    raise exception 'household_id kan niet gewijzigd worden.';
  end if;
  return NEW;
end;
$$;

create or replace function private.zet_wijzig_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'INSERT' then
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
    NEW.version := 1;
  elsif TG_OP = 'UPDATE' then
    NEW.created_by := OLD.created_by;
    NEW.updated_by := auth.uid();
    NEW.version := OLD.version + 1;
  end if;
  return NEW;
end;
$$;

-- ============================================================
-- 10. household_id + created_by/updated_by/version op alle
-- bestaande budgettabellen, backfill naar één huishouden, en de
-- hierboven gedefinieerde triggers + policies eraan hangen.
-- ============================================================
do $$
declare
  v_household_id uuid;
  v_owner_id uuid;
  v_tabel text;
  v_budgettabellen text[] := array[
    'inkomen', 'extra_inkomen', 'vaste_kosten', 'facturen', 'extra_uitgaven',
    'doelen', 'doel_bijdragen', 'investeringen', 'investering_transacties',
    'dashboard_maanden'
  ];
begin
  -- 10a. Eén huishouden voor de bestaande (demo-)data; de langst
  -- geregistreerde gebruiker wordt owner.
  select user_id into v_owner_id from profiles order by created_at limit 1;

  if v_owner_id is not null then
    insert into households (name, created_by) values ('Ons gezin', v_owner_id)
    returning id into v_household_id;

    insert into household_members (household_id, user_id, role, display_name)
    select v_household_id, user_id, 'owner', gebruikersnaam from profiles where user_id = v_owner_id;

    insert into household_members (household_id, user_id, role, display_name, invited_by)
    select v_household_id, user_id, 'editor', gebruikersnaam, v_owner_id
    from profiles where user_id <> v_owner_id;
  end if;

  -- 10b. household_id + metadata-kolommen + backfill + not-null + index
  -- + policies + triggers, generiek voor elke budgettabel.
  foreach v_tabel in array v_budgettabellen loop
    execute format('alter table %I add column if not exists household_id uuid references households(id)', v_tabel);
    execute format('alter table %I add column if not exists created_by uuid references auth.users(id)', v_tabel);
    execute format('alter table %I add column if not exists updated_by uuid references auth.users(id)', v_tabel);
    execute format('alter table %I add column if not exists version integer not null default 1', v_tabel);

    if v_household_id is not null then
      execute format('update %I set household_id = $1 where household_id is null', v_tabel) using v_household_id;
    end if;

    execute format('alter table %I alter column household_id set not null', v_tabel);
    execute format('create index if not exists %I on %I (household_id)', v_tabel || '_household_id_idx', v_tabel);

    execute format('alter table %I enable row level security', v_tabel);
    execute format('revoke all on %I from anon', v_tabel);

    execute format('drop policy if exists %I on %I', v_tabel || '_select', v_tabel);
    execute format(
      'create policy %I on %I for select using (private.is_member(household_id))',
      v_tabel || '_select', v_tabel
    );
    execute format('drop policy if exists %I on %I', v_tabel || '_insert', v_tabel);
    execute format(
      'create policy %I on %I for insert with check (private.can_edit(household_id))',
      v_tabel || '_insert', v_tabel
    );
    execute format('drop policy if exists %I on %I', v_tabel || '_update', v_tabel);
    execute format(
      'create policy %I on %I for update using (private.can_edit(household_id)) with check (private.can_edit(household_id))',
      v_tabel || '_update', v_tabel
    );
    execute format('drop policy if exists %I on %I', v_tabel || '_delete', v_tabel);
    execute format(
      'create policy %I on %I for delete using (private.can_edit(household_id))',
      v_tabel || '_delete', v_tabel
    );

    execute format(
      'drop trigger if exists trg_immutable_household on %I; create trigger trg_immutable_household before update on %I for each row execute function private.voorkom_household_wissel()',
      v_tabel, v_tabel
    );
    execute format(
      'drop trigger if exists trg_wijzig_metadata on %I; create trigger trg_wijzig_metadata before insert or update on %I for each row execute function private.zet_wijzig_metadata()',
      v_tabel, v_tabel
    );
  end loop;
end $$;

-- dashboard_maanden had "maand" als primary key (uniek over de hele
-- app); nu household_id erbij is, moet twee huishoudens elk hun eigen
-- "2026-09" kunnen registreren — vandaar een samengestelde sleutel.
alter table dashboard_maanden drop constraint if exists dashboard_maanden_pkey;
alter table dashboard_maanden add primary key (household_id, maand);

-- ============================================================
-- 11. instellingen: sleutel/waarde-tabel wordt nu per household
-- (samengestelde primary key), zelfde policies/triggers als hierboven.
-- ============================================================
alter table instellingen add column if not exists household_id uuid references households(id);
do $$
declare v_household_id uuid;
begin
  select id into v_household_id from households order by created_at limit 1;
  if v_household_id is not null then
    update instellingen set household_id = v_household_id where household_id is null;
  end if;
end $$;
alter table instellingen alter column household_id set not null;
alter table instellingen drop constraint if exists instellingen_pkey;
alter table instellingen add primary key (household_id, sleutel);
create index if not exists instellingen_household_id_idx on instellingen (household_id);

alter table instellingen enable row level security;
revoke all on instellingen from anon;
drop policy if exists instellingen_select on instellingen;
create policy instellingen_select on instellingen for select using (private.is_member(household_id));
drop policy if exists instellingen_insert on instellingen;
create policy instellingen_insert on instellingen for insert with check (private.can_edit(household_id));
drop policy if exists instellingen_update on instellingen;
create policy instellingen_update on instellingen for update
  using (private.can_edit(household_id)) with check (private.can_edit(household_id));

-- ============================================================
-- 12. RPC's — enkel deze zijn client-aanroepbaar (public-schema,
-- SECURITY DEFINER, expliciete GRANT aan authenticated). De Next.js
-- server actions roepen ze aan via de sessie-bewuste (anon-key)
-- client, nooit rechtstreeks vanuit de browser.
-- ============================================================

-- Nieuw huishouden + de aanmaker als owner, atomisch.
create or replace function create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;
  insert into households (name, created_by) values (p_name, auth.uid()) returning id into v_id;
  insert into household_members (household_id, user_id, role, display_name)
  values (v_id, auth.uid(), 'owner', (select gebruikersnaam from profiles where user_id = auth.uid()));
  return v_id;
end;
$$;
revoke all on function create_household(text) from public, anon;
grant execute on function create_household(text) to authenticated;

-- Eigenaarschap overdragen: nieuwe owner eerst promoveren, dan pas de
-- oude owner degraderen, zodat de laatste-owner-trigger nooit een gat ziet.
create or replace function transfer_household_ownership(p_household_id uuid, p_nieuwe_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_owner(p_household_id) then
    raise exception 'Enkel de eigenaar kan het eigenaarschap overdragen.';
  end if;
  if not exists (select 1 from household_members where household_id = p_household_id and user_id = p_nieuwe_owner_id) then
    raise exception 'Die gebruiker is geen lid van dit huishouden.';
  end if;
  update household_members set role = 'owner' where household_id = p_household_id and user_id = p_nieuwe_owner_id;
  update household_members set role = 'editor' where household_id = p_household_id and user_id = auth.uid();
end;
$$;
revoke all on function transfer_household_ownership(uuid, uuid) from public, anon;
grant execute on function transfer_household_ownership(uuid, uuid) to authenticated;

-- Uitnodiging opzoeken op basis van de (client-side gehashte) token —
-- publiek bruikbaar (nog geen sessie nodig om de accept-pagina te
-- tonen), maar geeft enkel de minimale, veilige velden terug.
create or replace function find_invite_by_token(p_token_hash text)
returns table (household_naam text, uitgenodigd_door text, rol text, geldig boolean, reden text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_invite household_invites%rowtype;
begin
  select * into v_invite from household_invites where token_hash = p_token_hash;

  if v_invite.id is null then
    return query select null::text, null::text, null::text, false, 'ongeldig';
    return;
  end if;
  if v_invite.revoked_at is not null then
    return query select null::text, null::text, null::text, false, 'ingetrokken';
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select null::text, null::text, null::text, false, 'verlopen';
    return;
  end if;
  if v_invite.use_count >= v_invite.max_uses then
    return query select null::text, null::text, null::text, false, 'opgebruikt';
    return;
  end if;

  return query
    select h.name, coalesce(p.gebruikersnaam, 'Iemand'), v_invite.role, true, null::text
    from households h
    left join profiles p on p.user_id = v_invite.created_by
    where h.id = v_invite.household_id;
end;
$$;
revoke all on function find_invite_by_token(text) from public;
grant execute on function find_invite_by_token(text) to anon, authenticated;

-- Uitnodiging accepteren: atomisch, met alle in de spec vermelde checks.
-- Enkel bruikbaar door een ingelogde, e-mailbevestigde gebruiker.
create or replace function accept_invite(p_token_hash text)
returns table (household_id uuid, ok boolean, reden text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite household_invites%rowtype;
  v_email text;
  v_email_bevestigd boolean;
begin
  if auth.uid() is null then
    return query select null::uuid, false, 'niet_ingelogd';
    return;
  end if;

  select email, email_confirmed_at is not null into v_email, v_email_bevestigd
  from auth.users where id = auth.uid();

  select * into v_invite from household_invites where token_hash = p_token_hash for update;

  if v_invite.id is null then
    return query select null::uuid, false, 'ongeldig';
    return;
  end if;
  if v_invite.revoked_at is not null then
    return query select null::uuid, false, 'ingetrokken';
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select null::uuid, false, 'verlopen';
    return;
  end if;
  if v_invite.use_count >= v_invite.max_uses then
    return query select null::uuid, false, 'opgebruikt';
    return;
  end if;
  if v_invite.email is not null then
    if not v_email_bevestigd then
      return query select null::uuid, false, 'email_niet_bevestigd';
      return;
    end if;
    if lower(v_invite.email) <> lower(v_email) then
      return query select null::uuid, false, 'ander_emailadres';
      return;
    end if;
  end if;
  if exists (select 1 from household_members where household_id = v_invite.household_id and user_id = auth.uid()) then
    return query select v_invite.household_id, false, 'al_lid';
    return;
  end if;

  insert into household_members (household_id, user_id, role, display_name, invited_by)
  values (
    v_invite.household_id, auth.uid(), v_invite.role,
    (select gebruikersnaam from profiles where user_id = auth.uid()),
    v_invite.created_by
  );

  update household_invites set use_count = use_count + 1 where id = v_invite.id;

  insert into activity_log (household_id, actor_id, action, entity, entity_id, summary)
  values (
    v_invite.household_id, auth.uid(), 'lid_toegetreden', 'household_members', null,
    coalesce((select gebruikersnaam from profiles where user_id = auth.uid()), 'Iemand') || ' is toegetreden tot het gezin.'
  );

  return query select v_invite.household_id, true, null::text;
end;
$$;
revoke all on function accept_invite(text) from public;
grant execute on function accept_invite(text) to authenticated;

-- kopieer_maand()/registreer_maand() (uit 0017_maanden.sql) kenden nog
-- geen household_id — dashboard_maanden en de budgettabellen zijn dat nu
-- wel verplicht. Herdefiniëren met household_id + can_edit-check.
drop function if exists kopieer_maand(text, text);
drop function if exists registreer_maand(text);

create or replace function kopieer_maand(p_household_id uuid, p_van_maand text, p_naar_maand text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.can_edit(p_household_id) then
    raise exception 'Geen toegang tot dit huishouden.';
  end if;

  insert into dashboard_maanden (household_id, maand) values (p_household_id, p_naar_maand)
  on conflict (household_id, maand) do nothing;

  insert into inkomen (household_id, bron, label, bedrag, frequentie, maand)
  select household_id, bron, label, bedrag, frequentie, p_naar_maand
  from inkomen where household_id = p_household_id and maand = p_van_maand;

  insert into vaste_kosten (household_id, label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald)
  select household_id, label, bedrag, categorie, icoon, vervaldag, eind_datum, p_naar_maand, false
  from vaste_kosten where household_id = p_household_id and maand = p_van_maand;

  insert into facturen (household_id, label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald)
  select household_id, label, bedrag, categorie, icoon, vervaldag, eind_datum, p_naar_maand, false
  from facturen where household_id = p_household_id and maand = p_van_maand;

  insert into extra_uitgaven (household_id, label, bedrag, overslaanbaar, maand, geskipt)
  select household_id, label, bedrag, overslaanbaar, p_naar_maand, false
  from extra_uitgaven where household_id = p_household_id and maand = p_van_maand;
end;
$$;
revoke all on function kopieer_maand(uuid, text, text) from public, anon;
grant execute on function kopieer_maand(uuid, text, text) to authenticated;

create or replace function registreer_maand(p_household_id uuid, p_maand text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.can_edit(p_household_id) then
    raise exception 'Geen toegang tot dit huishouden.';
  end if;
  insert into dashboard_maanden (household_id, maand) values (p_household_id, p_maand)
  on conflict (household_id, maand) do nothing;
end;
$$;
revoke all on function registreer_maand(uuid, text) from public, anon;
grant execute on function registreer_maand(uuid, text) to authenticated;

-- De oude wis_alle_data() verwijderde ALLES, van elk huishouden — onder
-- het household-model onaanvaardbaar gevaarlijk. Vervangen door een
-- expliciet household-gescopeerde, owner-only variant.
drop function if exists wis_alle_data();

create or replace function wis_household_data(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_owner(p_household_id) then
    raise exception 'Enkel de eigenaar kan alle gegevens van dit huishouden wissen.';
  end if;
  delete from inkomen where household_id = p_household_id;
  delete from extra_inkomen where household_id = p_household_id;
  delete from vaste_kosten where household_id = p_household_id;
  delete from facturen where household_id = p_household_id;
  delete from extra_uitgaven where household_id = p_household_id;
  delete from doelen where household_id = p_household_id; -- cascade ruimt doel_bijdragen mee op
  delete from investeringen where household_id = p_household_id; -- cascade ruimt investering_transacties mee op
  delete from dashboard_maanden where household_id = p_household_id;
end;
$$;
revoke all on function wis_household_data(uuid) from public, anon;
grant execute on function wis_household_data(uuid) to authenticated;

commit;

-- ============================================================
-- Controle achteraf — verwacht dezelfde aantallen als de SELECT's
-- helemaal bovenaan dit bestand.
-- ============================================================
-- select count(*) from profiles;
-- select count(*) from inkomen;
-- select count(*) from vaste_kosten;
-- select count(*) from facturen;
-- select count(*) from extra_uitgaven;
-- select count(*) from doelen;
-- select count(*) from investeringen;
-- select count(*) from dashboard_maanden;
-- select h.name, count(hm.*) as leden from households h join household_members hm on hm.household_id = h.id group by h.name;
