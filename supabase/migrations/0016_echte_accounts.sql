-- ============================================================
-- Echte accounts i.p.v. één hardcoded admin-login.
-- gebruikers.id wordt nu de id van de bijhorende Supabase Auth-
-- gebruiker (auth.users), aangemaakt via de nieuwe registratiepagina
-- (e-mail + gebruikersnaam + wachtwoord, gratis e-mailbevestiging via
-- Supabase's ingebouwde mailer — geen eigen domein/SMTP nodig).
-- De oude tabel bevatte enkel de automatisch aangemaakte ADMIN_USERNAME-
-- rij; die vervalt samen met de env-var-login.
-- ============================================================
drop table if exists gebruikers;

create table gebruikers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  gebruikersnaam text not null,
  rol text not null check (rol in ('admin', 'lid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_gebruikers_updated_at before update on gebruikers
  for each row execute function set_updated_at();

alter table gebruikers enable row level security;
