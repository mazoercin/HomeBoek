-- ------------------------------------------------------------
-- wis_alle_data
-- Verwijdert alle financiële data (inkomen, kosten, facturen, extra
-- uitgaven, doelen, goud) zodat het gezin terug bij een volledig leeg
-- dashboard start. De gebruikers-tabel wordt bewust NIET aangeraakt —
-- dit is een reset van de financiële gegevens, geen account-verwijdering.
-- vaste_kosten_betaald / facturen_betaald / geskipte_uitgaven worden
-- niet apart vermeld: die verdwijnen automatisch via "on delete cascade"
-- zodra hun ouder-rij (vaste_kosten/facturen/extra_uitgaven) verdwijnt.
-- Eén functie-aanroep = één atomische transactie.
-- ------------------------------------------------------------
create or replace function wis_alle_data()
returns void as $$
begin
  delete from vast_inkomen;
  delete from flexibel_inkomen;
  delete from extra_inkomen;
  delete from vaste_kosten;
  delete from facturen;
  delete from extra_uitgaven;
  delete from doelen;
  delete from goud_transacties;
end;
$$ language plpgsql;
