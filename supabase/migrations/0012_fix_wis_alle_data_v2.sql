-- Herstelt wis_alle_data() na de goud → investeringen-migratie en de
-- toevoeging van doel_bijdragen: die nieuwe tabellen moeten ook mee
-- leeggemaakt worden bij een volledige reset.
create or replace function wis_alle_data()
returns void as $$
begin
  delete from vast_inkomen where true;
  delete from flexibel_inkomen where true;
  delete from extra_inkomen where true;
  delete from vaste_kosten where true;
  delete from facturen where true;
  delete from extra_uitgaven where true;
  delete from doelen where true; -- cascade ruimt doel_bijdragen mee op
  delete from investeringen where true; -- cascade ruimt investering_transacties mee op
end;
$$ language plpgsql;
