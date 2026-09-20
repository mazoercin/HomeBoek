-- ============================================================
-- Gebruikersnaam wordt de manier waarop gezinsleden inloggen (in
-- plaats van e-mailadres), en de eigenaar kan voortaan zelf accounts
-- voor gezinsleden aanmaken (i.p.v. een deelbare uitnodigingslink).
-- Daarvoor moet een gebruikersnaam uniek zijn — dat was tot nu toe
-- niet afgedwongen.
--
-- ⚠️  VOOR JE DIT DRAAIT: als er ondertussen per ongeluk al twee
-- accounts met dezelfde gebruikersnaam bestaan (hoofdletterongevoelig),
-- faalt deze migratie. Check dat eerst met:
--
--   select lower(gebruikersnaam), count(*)
--   from profiles
--   group by lower(gebruikersnaam)
--   having count(*) > 1;
--
-- Geeft die query rijen terug, hernoem dan eerst één van de dubbels
-- (via Instellingen, of rechtstreeks met een update-statement) vóór je
-- onderstaande blok draait.
-- ============================================================

begin;

create unique index if not exists profiles_gebruikersnaam_lower_idx
  on profiles (lower(gebruikersnaam));

commit;
