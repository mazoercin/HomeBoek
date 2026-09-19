-- ============================================================
-- investeringen / investering_transacties
-- Vervangt de vaste "Goud"-tabel door een uitbreidbare structuur:
-- investeringen is de lijst van soorten (Goud, Aandelen, Crypto, ...),
-- investering_transacties zijn de handmatige stortingen per soort
-- (zelfde idee als voorheen bij goud_transacties, nu herbruikbaar
-- voor eender welk investeringstype dat het gezin later toevoegt).
-- ============================================================
create table investeringen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  created_at timestamptz not null default now()
);

create table investering_transacties (
  id uuid primary key default gen_random_uuid(),
  investering_id uuid not null references investeringen(id) on delete cascade,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  datum date not null default current_date,
  notitie text,
  created_at timestamptz not null default now()
);

create index investering_transacties_investering_id_idx on investering_transacties (investering_id);

alter table investeringen enable row level security;
alter table investering_transacties enable row level security;

-- Migreer de bestaande goud-data naar de nieuwe structuur, zodat
-- niemand zijn eerder ingevoerde goud-inleg kwijtraakt.
insert into investeringen (naam)
select 'Goud'
where not exists (select 1 from investeringen where naam = 'Goud');

insert into investering_transacties (investering_id, bedrag, datum, notitie, created_at)
select (select id from investeringen where naam = 'Goud' limit 1), bedrag, datum, notitie, created_at
from goud_transacties;

drop table goud_transacties;
