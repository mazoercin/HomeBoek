-- ============================================================
-- Maaltijdcheques als apart budget + betaalmethode op extra uitgaven
--
-- Nummering: de vorige migratie (account verwijderen/RPC verwijder_
-- household, FK's naar auth.users op ON DELETE SET NULL/CASCADE) is al
-- rechtstreeks in de Supabase SQL-editor uitgevoerd en is dus al live,
-- maar is toen niet als eigen bestand in de repo bewaard — er bestaat
-- geen 0026_*.sql hier. Deze migratie gaat verder als 0027 zodat de
-- nummering blijft aansluiten bij wat er echt, in volgorde, tegen de
-- database is uitgevoerd.
-- ============================================================
begin;

-- extra_uitgaven: hoe betaald (bankkaart of maaltijdcheque). "Visa"
-- (kredietkaart) staat hier bewust niet bij — dat wordt meteen als
-- Factuur aangemaakt (categorie 'krediet'), niet als extra_uitgaven-rij:
-- dat bedrag moet nog terugbetaald worden aan de kaart, dus het hoort
-- bij "openstaand", niet bij "al uitgegeven".
alter table extra_uitgaven
  add column betaalmethode text not null default 'bankkaart'
  check (betaalmethode in ('bankkaart', 'maaltijdcheque'));

-- inkomen: 'maaltijdcheques' toestaan als vierde bron naast zelf/partner/ander.
alter table inkomen
  drop constraint if exists inkomen_bron_check;
alter table inkomen
  add constraint inkomen_bron_check check (bron in ('zelf', 'partner', 'ander', 'maaltijdcheques'));

-- kopieer_maand() (zie 0018_huishoudens.sql) kopieert extra_uitgaven met
-- een expliciete kolomlijst — zonder deze aanpassing zou een
-- maaltijdcheque-uitgave bij het aanmaken van een nieuwe maand stilzwijgend
-- terugvallen op de default 'bankkaart'.
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

  insert into extra_uitgaven (household_id, label, bedrag, overslaanbaar, maand, geskipt, betaalmethode)
  select household_id, label, bedrag, overslaanbaar, p_naar_maand, false, betaalmethode
  from extra_uitgaven where household_id = p_household_id and maand = p_van_maand;
end;
$$;

commit;
