-- ------------------------------------------------------------
-- herschik_doelen
-- Herschrijft de prioriteit van ALLE doelen in één keer, op basis
-- van hun volgorde in de meegegeven array van id's (positie 0 = hoogste
-- prioriteit). Dit ondersteunt sleep-en-neerzet in de UI: één sleep-
-- actie kan een doel van eender welke positie naar eender welke andere
-- positie verplaatsen, niet enkel een simpele omwisseling van twee.
-- Atomisch: als één update faalt, wordt alles teruggedraaid.
-- ------------------------------------------------------------
create or replace function herschik_doelen(p_doel_ids uuid[])
returns void as $$
declare
  v_id uuid;
  v_positie integer := 0;
begin
  foreach v_id in array p_doel_ids
  loop
    update doelen set prioriteit = v_positie where id = v_id;
    v_positie := v_positie + 1;
  end loop;
end;
$$ language plpgsql;
