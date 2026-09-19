-- ============================================================
-- doel_bijdragen.aftrekken_van_inkomen
-- Bij elke storting in een spaarpot kies je nu of dat bedrag van
-- het inkomen van die maand afgetrokken moet worden (bv. je legt
-- opzij van je loon, dus minder "wat overblijft") of niet (bv. je
-- stort iets wat je toch al apart had staan, dus geen effect op
-- de maandberekening).
-- ============================================================
alter table doel_bijdragen
  add column aftrekken_van_inkomen boolean not null default false;
