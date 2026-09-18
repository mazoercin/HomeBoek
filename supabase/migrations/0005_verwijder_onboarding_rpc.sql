-- De aparte onboarding-wizard is vervangen door inline, stap-voor-stap
-- invulkaders rechtstreeks op het dashboard (elk kader slaat zijn eigen
-- item apart op via de bestaande enkelvoudige insert-acties). De
-- gebundelde onboarding-transactie is daardoor niet meer nodig.
drop function if exists onboarding_opslaan(jsonb);
