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
-- "where true" is verplicht: Supabase-projecten hebben standaard een
-- veiligheidsextensie die elke DELETE zonder WHERE-clausule blokkeert
-- (ook binnen een functie), om te voorkomen dat een hele tabel per
-- ongeluk leeggemaakt wordt. "where true" is functioneel "alles",
-- maar voldoet expliciet aan die vereiste.
create or replace function wis_alle_data()
returns void as $$
begin
  delete from vast_inkomen where true;
  delete from flexibel_inkomen where true;
  delete from extra_inkomen where true;
  delete from vaste_kosten where true;
  delete from facturen where true;
  delete from extra_uitgaven where true;
  delete from doelen where true;
  delete from goud_transacties where true;
end;
$$ language plpgsql;
