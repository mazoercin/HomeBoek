-- ============================================================
-- inkomen
-- Vervangt vast_inkomen + flexibel_inkomen door één tabel: élke
-- inkomenspost krijgt gewoon een frequentie (i.p.v. een aparte
-- "vast = altijd maandelijks"-tabel naast een "flexibel = met een
-- volgende-datum-anker"-tabel). Een terugkerende post draagt elke
-- maand hetzelfde, gemiddelde maandbedrag bij aan het totaal — dat is
-- veel voorspelbaarder dan proberen te raden in wélke exacte maand een
-- driemaandelijkse premie precies valt, en het is precies hoe
-- "wekelijks × 4" al bedoeld was.
-- ============================================================
create table inkomen (
  id uuid primary key default gen_random_uuid(),
  bron text not null check (bron in ('zelf', 'partner', 'ander')),
  label text not null,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  frequentie text not null check (
    frequentie in ('wekelijks', 'maandelijks', '3-maandelijks', '6-maandelijks', 'jaarlijks')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_inkomen_updated_at before update on inkomen
  for each row execute function set_updated_at();

alter table inkomen enable row level security;

-- Migreer bestaande data, zodat niemand iets kwijtraakt.
insert into inkomen (bron, label, bedrag, frequentie, created_at, updated_at)
select bron, label, bedrag, 'maandelijks', created_at, updated_at
from vast_inkomen;

insert into inkomen (bron, label, bedrag, frequentie, created_at, updated_at)
select
  bron,
  label,
  bedrag,
  case interval
    when 'maandelijks' then 'maandelijks'
    when '2-maandelijks' then '3-maandelijks' -- dichtstbijzijnde nieuwe optie
    when '3-maandelijks' then '3-maandelijks'
    when 'halfjaarlijks' then '6-maandelijks'
    when 'jaarlijks' then 'jaarlijks'
    else 'maandelijks'
  end,
  created_at,
  updated_at
from flexibel_inkomen;

drop table vast_inkomen;
drop table flexibel_inkomen;
