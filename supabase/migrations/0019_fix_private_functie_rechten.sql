-- ============================================================
-- Fix: private.is_member/can_edit/is_owner() verloren in 0018 alle
-- uitvoeringsrechten, ook voor "authenticated" — waardoor ELKE RLS-
-- policy die ze gebruikt (op households, household_members, en alle
-- budgettabellen) faalde met een permission-denied-fout voor elke
-- ingelogde gebruiker. vereisHousehold() ving die fout op en
-- behandelde ze stelselmatig als "geen huishouden gevonden", wat
-- leidde tot een oneindige redirect-lus tussen /dashboard en
-- /gezin/starten (en telkens een nieuw, wees huishouden aanmaakte).
--
-- Een functie die binnen een RLS-policy geëvalueerd wordt, vereist dat
-- de aanroepende rol (hier: authenticated) EXECUTE-recht heeft — ook al
-- is de functie zelf SECURITY DEFINER (dat bepaalt enkel de rechten
-- wáármee de functie-body draait, niet wíe ze mag aanroepen). Het apart
-- in het "private"-schema plaatsen (niet blootgesteld via PostgREST)
-- volstond al om directe RPC-aanroepen van buitenaf tegen te houden;
-- de extra REVOKE was overbodig én brak per ongeluk elke policy-
-- evaluatie voor gewone ingelogde gebruikers.
-- ============================================================

begin;

grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.can_edit(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;

commit;
