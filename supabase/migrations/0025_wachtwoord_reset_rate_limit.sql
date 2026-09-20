-- Nieuwe soort 'reset' naast de bestaande 'accept'/'aanmaken'/'login' —
-- voor de rate-limit op wachtwoord-reset-aanvragen. Geen nieuwe kolommen
-- nodig: identificator_hash/ip_hash/gelukt/created_at bestaan al sinds
-- migratie 0023.
alter table invite_pogingen
  drop constraint if exists invite_pogingen_soort_check;
alter table invite_pogingen
  add constraint invite_pogingen_soort_check check (soort in ('accept', 'aanmaken', 'login', 'reset'));
