-- ============================================================
-- doel_bijdragen
-- Handmatige stortingen per spaardoel (zelfde patroon als
-- goud_transacties). "Reeds gespaard" voor een doel = som van zijn
-- bijdragen — dit vervangt de eerdere schatting op basis van
-- verstreken maanden × maandelijks bedrag, wat enkel een benadering
-- was. Cascade-delete: verdwijnt een doel, dan verdwijnt zijn
-- spaargeschiedenis logischerwijze mee.
-- ============================================================
create table doel_bijdragen (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  bedrag numeric(12, 2) not null check (bedrag > 0),
  datum date not null default current_date,
  notitie text,
  created_at timestamptz not null default now()
);

create index doel_bijdragen_doel_id_idx on doel_bijdragen (doel_id);

alter table doel_bijdragen enable row level security;
