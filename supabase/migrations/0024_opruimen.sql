-- Controleer eerst zelf:
-- select count(*) from instellingen;  -- verwacht: 0 (of enkel dode testdata)

-- Dode tabel: geen enkele app-code-referentie, geen views/foreign keys/
-- functies die ernaar verwijzen (gecontroleerd via pg_depend). De trigger
-- trg_instellingen_updated_at en de 3 policies horen intrinsiek bij de
-- tabel en worden door "drop table" automatisch mee opgeruimd.
drop table if exists instellingen;

-- Dode functies: verplaats_doel_prioriteit is vervangen door
-- herschik_doelen (0004_herschik_doelen.sql), bereken_reeds_gespaard_voor_doel
-- werd nooit vanuit de app aangeroepen. Geen enkele andere functie noemt
-- ze in haar body (gecontroleerd via pg_proc).
drop function if exists verplaats_doel_prioriteit(uuid, integer, uuid, integer);
drop function if exists bereken_reeds_gespaard_voor_doel(uuid);
