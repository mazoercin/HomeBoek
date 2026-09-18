-- ============================================================
-- instellingen
-- Kleine sleutel/waarde-tabel voor gezinsbrede instellingen (bv. de
-- familienaam die bovenaan het dashboard getoond wordt). Bewust
-- sleutel/waarde i.p.v. losse kolommen, zodat er later moeiteloos
-- nieuwe instellingen bij kunnen zonder het schema te wijzigen.
-- ============================================================
create table instellingen (
  sleutel text primary key,
  waarde text not null,
  updated_at timestamptz not null default now()
);

create trigger trg_instellingen_updated_at before update on instellingen
  for each row execute function set_updated_at();

alter table instellingen enable row level security;
