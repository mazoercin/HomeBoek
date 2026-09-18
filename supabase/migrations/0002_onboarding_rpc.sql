-- Eén RPC-functie die alle onboarding-data in één databasetransactie
-- wegschrijft. Een functie-aanroep in Postgres is atomisch: als er
-- ergens een fout optreedt (bv. een check-constraint die faalt), wordt
-- de volledige functie teruggedraaid en blijft er geen halve data
-- hangen — precies wat de spec vereist bij stap 5 van de wizard.
create or replace function onboarding_opslaan(payload jsonb)
returns void as $$
begin
  insert into vast_inkomen (bron, label, bedrag)
  select x.bron, x.label, x.bedrag
  from jsonb_to_recordset(payload -> 'vast_inkomen') as x(bron text, label text, bedrag numeric);

  insert into flexibel_inkomen (bron, label, bedrag, interval, volgende_datum)
  select x.bron, x.label, x.bedrag, x.interval, x.volgende_datum
  from jsonb_to_recordset(payload -> 'flexibel_inkomen')
    as x(bron text, label text, bedrag numeric, interval text, volgende_datum date);

  insert into vaste_kosten (label, bedrag, categorie, icoon, vervaldag, eind_datum)
  select x.label, x.bedrag, x.categorie, x.icoon, x.vervaldag, x.eind_datum
  from jsonb_to_recordset(payload -> 'vaste_kosten')
    as x(label text, bedrag numeric, categorie text, icoon text, vervaldag smallint, eind_datum date);

  insert into facturen (label, bedrag, categorie, icoon, vervaldag, eind_datum)
  select x.label, x.bedrag, x.categorie, x.icoon, x.vervaldag, x.eind_datum
  from jsonb_to_recordset(payload -> 'facturen')
    as x(label text, bedrag numeric, categorie text, icoon text, vervaldag smallint, eind_datum date);

  insert into extra_uitgaven (label, bedrag, overslaanbaar)
  select x.label, x.bedrag, x.overslaanbaar
  from jsonb_to_recordset(payload -> 'extra_uitgaven') as x(label text, bedrag numeric, overslaanbaar boolean);

  insert into doelen (naam, target_bedrag, maandelijks_bedrag, prioriteit)
  select x.naam, x.target_bedrag, x.maandelijks_bedrag, x.prioriteit
  from jsonb_to_recordset(payload -> 'doelen')
    as x(naam text, target_bedrag numeric, maandelijks_bedrag numeric, prioriteit integer);
end;
$$ language plpgsql;
