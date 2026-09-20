-- ============================================================
-- Rate-limiting voor login: hergebruikt de bestaande
-- invite_pogingen-tabel en de magDoor()/registreerPoging()-aanpak
-- (soort 'login' naast de bestaande 'accept'/'aanmaken'). RLS en
-- grants blijven exact zoals ze zijn — enkel bereikbaar via de
-- service-role.
-- ============================================================

alter table invite_pogingen
  add column if not exists identificator_hash text;

alter table invite_pogingen
  drop constraint if exists invite_pogingen_soort_check;
alter table invite_pogingen
  add constraint invite_pogingen_soort_check check (soort in ('accept', 'aanmaken', 'login'));

create index if not exists invite_pogingen_identificator_idx
  on invite_pogingen (identificator_hash, created_at desc);
