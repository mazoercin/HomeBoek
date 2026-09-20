-- ============================================================
-- Wekelijks inkomen met een apart bedrag per week (i.p.v. één vast
-- bedrag × 4): bv. een variabel loon dat elke week anders is.
--
-- Een inkomenspost met frequentie 'wekelijks' kan hier tot 4 losse
-- weekbedragen aan hangen. Zolang er geen enkele rij voor bestaat,
-- blijft de bestaande "bedrag × 4"-vuistregel gelden (zie
-- lib/calculations/inkomen.ts) — volledig achterwaarts compatibel,
-- geen enkele bestaande inkomenspost verandert van gedrag.
-- ============================================================

begin;

create table inkomen_weekbedragen (
  id uuid primary key default gen_random_uuid(),
  inkomen_id uuid not null references inkomen(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  week_nummer smallint not null check (week_nummer between 1 and 4),
  bedrag numeric(12,2) not null check (bedrag >= 0),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inkomen_id, week_nummer)
);

create index inkomen_weekbedragen_inkomen_id_idx on inkomen_weekbedragen (inkomen_id);
create index inkomen_weekbedragen_household_id_idx on inkomen_weekbedragen (household_id);

alter table inkomen_weekbedragen enable row level security;
revoke all on inkomen_weekbedragen from anon;

create policy inkomen_weekbedragen_select on inkomen_weekbedragen
  for select using (private.is_member(household_id));
create policy inkomen_weekbedragen_insert on inkomen_weekbedragen
  for insert with check (private.can_edit(household_id));
create policy inkomen_weekbedragen_update on inkomen_weekbedragen
  for update using (private.can_edit(household_id)) with check (private.can_edit(household_id));
create policy inkomen_weekbedragen_delete on inkomen_weekbedragen
  for delete using (private.can_edit(household_id));

create trigger trg_immutable_household before update on inkomen_weekbedragen
  for each row execute function private.voorkom_household_wissel();
create trigger trg_wijzig_metadata before insert or update on inkomen_weekbedragen
  for each row execute function private.zet_wijzig_metadata();

commit;
