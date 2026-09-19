-- ============================================================
-- Maand-per-maand dashboard.
-- Inkomen/vaste kosten/facturen/extra uitgaven waren tot nu toe één
-- globale, altijd-geldige lijst. Voortaan hoort elke rij bij één
-- specifieke maand (net als extra_inkomen al deed) zodat je een nieuwe
-- maand kan "registreren" (leeg, of gekopieerd van de vorige) en elke
-- maand zijn eigen, onafhankelijke cijfers en betaald-status heeft.
--
-- Betaald/geskipt-status hoefde vroeger een aparte tabel te zijn omdat
-- één vaste_kost-rij voor elke maand gold. Nu een rij toch al maar één
-- maand vertegenwoordigt, verhuist die status gewoon rechtstreeks op
-- de rij zelf — simpeler, en "nieuwe maand" = nieuwe rij = automatisch
-- weer onbetaald/niet-geskipt.
-- ============================================================

create table dashboard_maanden (
  maand text primary key check (maand ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now()
);
alter table dashboard_maanden enable row level security;

insert into dashboard_maanden (maand) values (to_char(now(), 'YYYY-MM'));

-- ---------- inkomen ----------
alter table inkomen add column maand text;
update inkomen set maand = to_char(now(), 'YYYY-MM') where maand is null;
alter table inkomen alter column maand set not null;
alter table inkomen add constraint inkomen_maand_check check (maand ~ '^\d{4}-\d{2}$');

-- ---------- vaste_kosten: + maand, + betaald (uit vaste_kosten_betaald) ----------
alter table vaste_kosten add column maand text;
update vaste_kosten set maand = to_char(now(), 'YYYY-MM') where maand is null;
alter table vaste_kosten alter column maand set not null;
alter table vaste_kosten add constraint vaste_kosten_maand_check check (maand ~ '^\d{4}-\d{2}$');

alter table vaste_kosten add column betaald boolean not null default false;
update vaste_kosten vk set betaald = vkb.betaald
  from vaste_kosten_betaald vkb
  where vkb.vaste_kost_id = vk.id and vkb.maand = vk.maand;

drop function if exists zet_vaste_kost_betaald(uuid, text, boolean);
drop table vaste_kosten_betaald;

-- ---------- facturen: + maand, + betaald (uit facturen_betaald) ----------
alter table facturen add column maand text;
update facturen set maand = to_char(now(), 'YYYY-MM') where maand is null;
alter table facturen alter column maand set not null;
alter table facturen add constraint facturen_maand_check check (maand ~ '^\d{4}-\d{2}$');

alter table facturen add column betaald boolean not null default false;
update facturen f set betaald = fb.betaald
  from facturen_betaald fb
  where fb.factuur_id = f.id and fb.maand = f.maand;

drop function if exists zet_factuur_betaald(uuid, text, boolean);
drop table facturen_betaald;

-- ---------- extra_uitgaven: + maand, + geskipt (uit geskipte_uitgaven) ----------
alter table extra_uitgaven add column maand text;
update extra_uitgaven set maand = to_char(now(), 'YYYY-MM') where maand is null;
alter table extra_uitgaven alter column maand set not null;
alter table extra_uitgaven add constraint extra_uitgaven_maand_check check (maand ~ '^\d{4}-\d{2}$');

alter table extra_uitgaven add column geskipt boolean not null default false;
update extra_uitgaven eu set geskipt = true
  from geskipte_uitgaven gu
  where gu.extra_uitgave_id = eu.id and gu.maand = eu.maand;

drop function if exists zet_extra_uitgave_geskipt(uuid, text, boolean);
drop table geskipte_uitgaven;

-- ---------- kopieer_maand: dupliceert een maand naar een nieuwe, altijd terug onbetaald/niet-geskipt ----------
create or replace function kopieer_maand(p_van_maand text, p_naar_maand text)
returns void as $$
begin
  insert into dashboard_maanden (maand) values (p_naar_maand)
  on conflict (maand) do nothing;

  insert into inkomen (bron, label, bedrag, frequentie, maand)
  select bron, label, bedrag, frequentie, p_naar_maand
  from inkomen where maand = p_van_maand;

  insert into vaste_kosten (label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald)
  select label, bedrag, categorie, icoon, vervaldag, eind_datum, p_naar_maand, false
  from vaste_kosten where maand = p_van_maand;

  insert into facturen (label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald)
  select label, bedrag, categorie, icoon, vervaldag, eind_datum, p_naar_maand, false
  from facturen where maand = p_van_maand;

  insert into extra_uitgaven (label, bedrag, overslaanbaar, maand, geskipt)
  select label, bedrag, overslaanbaar, p_naar_maand, false
  from extra_uitgaven where maand = p_van_maand;
end;
$$ language plpgsql;

-- ---------- registreer_maand: maakt een lege maand aan (geen kopie) ----------
create or replace function registreer_maand(p_maand text)
returns void as $$
begin
  insert into dashboard_maanden (maand) values (p_maand)
  on conflict (maand) do nothing;
end;
$$ language plpgsql;

-- ---------- wis_alle_data: nu ook dashboard_maanden, geen losse betaald/geskipt-tabellen meer ----------
create or replace function wis_alle_data()
returns void as $$
begin
  delete from inkomen where true;
  delete from extra_inkomen where true;
  delete from vaste_kosten where true;
  delete from facturen where true;
  delete from extra_uitgaven where true;
  delete from doelen where true; -- cascade ruimt doel_bijdragen mee op
  delete from investeringen where true; -- cascade ruimt investering_transacties mee op
  delete from dashboard_maanden where true;
end;
$$ language plpgsql;
