-- Saldo — HuisBoek: initieel datamodel.
-- Elke tabel heeft id/created_at/updated_at, en een trigger die
-- updated_at automatisch bijwerkt bij elke wijziging.

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- gebruikers
-- Wie mag inloggen en wat mag die zien. Voor nu 1 record (Admin),
-- maar ontworpen om later meerdere gezinsleden toe te laten zonder
-- het schema te moeten wijzigen: rol bepaalt de rechten.
-- ============================================================
create table gebruikers (
  id uuid primary key default gen_random_uuid(),
  gebruikersnaam text not null unique,
  rol text not null check (rol in ('admin', 'lid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_gebruikers_updated_at before update on gebruikers
  for each row execute function set_updated_at();

-- ============================================================
-- vast_inkomen
-- Inkomen dat elke maand hetzelfde binnenkomt (loon, kindergeld, ...).
-- bron onderscheidt wie het inkomen inbrengt, puur informatief/UI.
-- ============================================================
create table vast_inkomen (
  id uuid primary key default gen_random_uuid(),
  bron text not null check (bron in ('zelf', 'partner', 'ander')),
  label text not null,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_vast_inkomen_updated_at before update on vast_inkomen
  for each row execute function set_updated_at();

-- ============================================================
-- flexibel_inkomen
-- Terugkerend inkomen dat NIET elke maand komt (bv. premie om de
-- 3 maanden). interval + volgende_datum laten de rekenlogica bepalen
-- of dit een gegeven maand wel/niet meetelt.
-- ============================================================
create table flexibel_inkomen (
  id uuid primary key default gen_random_uuid(),
  bron text not null check (bron in ('zelf', 'partner', 'ander')),
  label text not null,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  interval text not null check (
    interval in ('maandelijks', '2-maandelijks', '3-maandelijks', 'halfjaarlijks', 'jaarlijks')
  ),
  volgende_datum date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_flexibel_inkomen_updated_at before update on flexibel_inkomen
  for each row execute function set_updated_at();

-- ============================================================
-- extra_inkomen
-- Eenmalig, expliciet ingevoerd inkomen voor één specifieke maand
-- (bv. een bonus). maand als 'YYYY-MM'-tekst i.p.v. een datum, zodat
-- vergelijken met de dashboard-periode altijd een simpele string-match is.
-- ============================================================
create table extra_inkomen (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  maand text not null check (maand ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_extra_inkomen_updated_at before update on extra_inkomen
  for each row execute function set_updated_at();

-- ============================================================
-- vaste_kosten
-- Niet-stopbare, terugkerende kosten (huis, verzekering, kredieten).
-- vervaldag (1-31) is optioneel omdat niet elke kost een vaste dag
-- heeft; eind_datum laat een krediet/lening netjes "aflopen" zonder
-- de rij te moeten verwijderen (historiek blijft bewaard).
-- ============================================================
create table vaste_kosten (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  categorie text not null check (
    categorie in ('huis', 'energie', 'mazout_gas', 'water', 'internet', 'verzekering', 'krediet', 'andere')
  ),
  icoon text not null default '📄',
  vervaldag smallint check (vervaldag between 1 and 31),
  eind_datum date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_vaste_kosten_updated_at before update on vaste_kosten
  for each row execute function set_updated_at();

-- Per-maand betaald-status van een vaste kost, los van de kost zelf
-- zodat de geschiedenis van elke maand bewaard blijft.
create table vaste_kosten_betaald (
  id uuid primary key default gen_random_uuid(),
  vaste_kost_id uuid not null references vaste_kosten(id) on delete cascade,
  maand text not null check (maand ~ '^\d{4}-\d{2}$'),
  betaald boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vaste_kost_id, maand)
);
create trigger trg_vaste_kosten_betaald_updated_at before update on vaste_kosten_betaald
  for each row execute function set_updated_at();

-- ============================================================
-- facturen
-- Zelfde structuur als vaste_kosten (elektriciteit, mazout/gas,
-- water, internet), maar bewust een aparte tabel zodat het dashboard
-- ze in een eigen kader kan tonen los van de andere vaste kosten.
-- ============================================================
create table facturen (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  categorie text not null check (
    categorie in ('huis', 'energie', 'mazout_gas', 'water', 'internet', 'verzekering', 'krediet', 'andere')
  ),
  icoon text not null default '📄',
  vervaldag smallint check (vervaldag between 1 and 31),
  eind_datum date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_facturen_updated_at before update on facturen
  for each row execute function set_updated_at();

create table facturen_betaald (
  id uuid primary key default gen_random_uuid(),
  factuur_id uuid not null references facturen(id) on delete cascade,
  maand text not null check (maand ~ '^\d{4}-\d{2}$'),
  betaald boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (factuur_id, maand)
);
create trigger trg_facturen_betaald_updated_at before update on facturen_betaald
  for each row execute function set_updated_at();

-- ============================================================
-- extra_uitgaven
-- Pauzeerbare abonnementen en kleine terugkerende uitgaven.
-- overslaanbaar bepaalt of dit item in de "Wat als?"-simulatie en de
-- automatische tekort-voorstellen mag opduiken.
-- ============================================================
create table extra_uitgaven (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  overslaanbaar boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_extra_uitgaven_updated_at before update on extra_uitgaven
  for each row execute function set_updated_at();

-- Registreert dat een extra uitgave voor een specifieke maand bewust
-- is overgeslagen — los van de uitgave zelf zodat de "normale" waarde
-- niet verloren gaat wanneer je één maand pauzeert.
create table geskipte_uitgaven (
  id uuid primary key default gen_random_uuid(),
  extra_uitgave_id uuid not null references extra_uitgaven(id) on delete cascade,
  maand text not null check (maand ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  unique (extra_uitgave_id, maand)
);

-- ============================================================
-- doelen
-- Spaardoelen met een handmatig ingestelde prioriteit (drag & drop
-- in de UI schrijft gewoon een nieuw prioriteit-getal weg).
-- ============================================================
create table doelen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  target_bedrag numeric(12, 2) not null check (target_bedrag > 0),
  maandelijks_bedrag numeric(12, 2) not null default 0 check (maandelijks_bedrag >= 0),
  prioriteit integer not null default 0,
  gepauzeerd boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_doelen_updated_at before update on doelen
  for each row execute function set_updated_at();

-- ============================================================
-- goud_transacties
-- Handmatige registratie van goud-inleg (geen live koers-integratie).
-- ============================================================
create table goud_transacties (
  id uuid primary key default gen_random_uuid(),
  bedrag numeric(12, 2) not null check (bedrag > 0),
  datum date not null,
  notitie text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Rijbeveiliging (RLS)
-- De app draait met de service-role key voor server-side logica en
-- met de anon-key voor ingelogde sessies; RLS staat aan zodat een
-- rechtstreekse, niet-geauthenticeerde call nooit data kan lezen of
-- schrijven. Alle toegang loopt via de Next.js server (session-cookie
-- + requireRole), niet via directe client-side Supabase-calls.
-- ============================================================
alter table gebruikers enable row level security;
alter table vast_inkomen enable row level security;
alter table flexibel_inkomen enable row level security;
alter table extra_inkomen enable row level security;
alter table vaste_kosten enable row level security;
alter table vaste_kosten_betaald enable row level security;
alter table facturen enable row level security;
alter table facturen_betaald enable row level security;
alter table extra_uitgaven enable row level security;
alter table geskipte_uitgaven enable row level security;
alter table doelen enable row level security;
alter table goud_transacties enable row level security;
