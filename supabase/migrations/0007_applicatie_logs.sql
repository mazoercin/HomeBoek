-- ============================================================
-- applicatie_logs
-- Het logboek dat de admin-instellingenpagina toont. Dit staat in de
-- database (i.p.v. een lokaal bestand zoals in de originele opzet)
-- omdat Vercel's serverless functies een schrijfbeveiligd, wegwerp-
-- bestandssysteem hebben: elke aanroep kan in een ander, kortstondig
-- containertje draaien, dus een lokaal "logs/app.log"-bestand
-- verdwijnt meteen weer en is niet betrouwbaar leesbaar. Een tabel is
-- de logische, persistente vervanger — dezelfde functie, wel
-- betrouwbaar in een serverless omgeving.
-- ============================================================
create table applicatie_logs (
  id uuid primary key default gen_random_uuid(),
  aangemaakt_op timestamptz not null default now(),
  niveau text not null check (niveau in ('INFO', 'WARN', 'ERROR')),
  code text not null,
  bericht text not null,
  context jsonb
);

-- Snelle "laatste 200 regels"-query voor de instellingenpagina.
create index applicatie_logs_aangemaakt_op_idx on applicatie_logs (aangemaakt_op desc);

alter table applicatie_logs enable row level security;
