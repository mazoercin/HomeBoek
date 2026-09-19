-- Herstelt wis_alle_data() na de samenvoeging van vast_inkomen +
-- flexibel_inkomen tot één "inkomen"-tabel.
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
end;
$$ language plpgsql;
