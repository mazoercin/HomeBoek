-- Herstelt wis_alle_data(): Supabase-projecten blokkeren standaard elke
-- DELETE zonder WHERE-clausule (veiligheidsextensie tegen per-ongeluk
-- een hele tabel leegmaken). "where true" is functioneel "alles",
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
