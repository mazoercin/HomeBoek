-- ============================================================
-- Rollback voor 0018_huishoudens.sql.
-- Enkel veilig zolang er nog maar ÉÉN huishouden bestaat (de
-- automatisch aangemaakte "Ons gezin" uit de migratie zelf) — als er
-- ondertussen een tweede huishouden of uitnodiging is aangemaakt, gaat
-- die data hier verloren. Controleer dat eerst:
--   select count(*) from households;  -- verwacht: 1
-- ============================================================

begin;

-- dashboard_maanden had household_id in zijn primary key — die
-- constraint moet eerst weg voor de generieke kolom-drop hieronder kan
-- slagen.
alter table dashboard_maanden drop constraint if exists dashboard_maanden_pkey;
alter table dashboard_maanden add primary key (maand);

drop function if exists kopieer_maand(uuid, text, text);
drop function if exists registreer_maand(uuid, text);
create or replace function kopieer_maand(p_van_maand text, p_naar_maand text)
returns void as $$
begin
  insert into dashboard_maanden (maand) values (p_naar_maand) on conflict (maand) do nothing;
  insert into inkomen (bron, label, bedrag, frequentie, maand)
  select bron, label, bedrag, frequentie, p_naar_maand from inkomen where maand = p_van_maand;
  insert into vaste_kosten (label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald)
  select label, bedrag, categorie, icoon, vervaldag, eind_datum, p_naar_maand, false from vaste_kosten where maand = p_van_maand;
  insert into facturen (label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald)
  select label, bedrag, categorie, icoon, vervaldag, eind_datum, p_naar_maand, false from facturen where maand = p_van_maand;
  insert into extra_uitgaven (label, bedrag, overslaanbaar, maand, geskipt)
  select label, bedrag, overslaanbaar, p_naar_maand, false from extra_uitgaven where maand = p_van_maand;
end;
$$ language plpgsql;
create or replace function registreer_maand(p_maand text)
returns void as $$
begin
  insert into dashboard_maanden (maand) values (p_maand) on conflict (maand) do nothing;
end;
$$ language plpgsql;

do $$
declare
  v_tabel text;
  v_budgettabellen text[] := array[
    'inkomen', 'extra_inkomen', 'vaste_kosten', 'facturen', 'extra_uitgaven',
    'doelen', 'doel_bijdragen', 'investeringen', 'investering_transacties',
    'dashboard_maanden'
  ];
begin
  foreach v_tabel in array v_budgettabellen loop
    execute format('drop trigger if exists trg_immutable_household on %I', v_tabel);
    execute format('drop trigger if exists trg_wijzig_metadata on %I', v_tabel);
    execute format('drop policy if exists %I on %I', v_tabel || '_select', v_tabel);
    execute format('drop policy if exists %I on %I', v_tabel || '_insert', v_tabel);
    execute format('drop policy if exists %I on %I', v_tabel || '_update', v_tabel);
    execute format('drop policy if exists %I on %I', v_tabel || '_delete', v_tabel);
    execute format('alter table %I disable row level security', v_tabel);
    execute format('grant all on %I to anon', v_tabel);
    execute format('alter table %I drop column if exists household_id', v_tabel);
    execute format('alter table %I drop column if exists created_by', v_tabel);
    execute format('alter table %I drop column if exists updated_by', v_tabel);
    execute format('alter table %I drop column if exists version', v_tabel);
  end loop;
end $$;

alter table instellingen drop constraint if exists instellingen_pkey;
alter table instellingen add primary key (sleutel);
drop policy if exists instellingen_select on instellingen;
drop policy if exists instellingen_insert on instellingen;
drop policy if exists instellingen_update on instellingen;
alter table instellingen drop column if exists household_id;
grant all on instellingen to anon;

drop function if exists wis_household_data(uuid);
create or replace function wis_alle_data()
returns void as $$
begin
  delete from inkomen where true;
  delete from extra_inkomen where true;
  delete from vaste_kosten where true;
  delete from facturen where true;
  delete from extra_uitgaven where true;
  delete from doelen where true;
  delete from investeringen where true;
  delete from dashboard_maanden where true;
end;
$$ language plpgsql;

drop function if exists accept_invite(text);
drop function if exists find_invite_by_token(text);
drop function if exists transfer_household_ownership(uuid, uuid);
drop function if exists create_household(text);

drop trigger if exists trg_bescherm_laatste_owner on household_members;
drop function if exists private.bescherm_laatste_owner();
drop function if exists private.voorkom_household_wissel();
drop function if exists private.zet_wijzig_metadata();
drop function if exists private.is_member(uuid);
drop function if exists private.can_edit(uuid);
drop function if exists private.is_owner(uuid);

drop table if exists activity_log;
drop table if exists invite_pogingen;
drop table if exists household_invites;
drop table if exists household_members;
drop table if exists households;

drop policy if exists profiles_select_self on profiles;
drop policy if exists profiles_select_huisgenoten on profiles;
drop policy if exists profiles_update_self on profiles;
alter table profiles disable row level security;
grant all on profiles to anon;
alter table profiles drop column if exists avatar_color;
alter table profiles rename column user_id to id;
alter table profiles rename to gebruikers;
alter table gebruikers add column rol text not null default 'lid' check (rol in ('admin', 'lid'));

drop schema if exists private;

commit;
