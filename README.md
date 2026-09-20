# HuisBalans

Gezinsfinanciën overzichtelijk beheren: inkomen, vaste kosten, facturen,
extra uitgaven, doelen en goud-investering, met instant berekeningen.

## Starten

1. Kopieer `.env.example` naar `.env.local` en vul in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — uit je Supabase-project (Settings → API)
   - `SESSION_SECRET` — een lange, willekeurige string
   - `RATE_LIMIT_SALT` — een lange, willekeurige string
   - `SITE_URL` — enkel verplicht in productie (zie `.env.example`)
2. Voer de SQL-migraties in `supabase/migrations/` uit in je Supabase-project, in volgorde (`0001_init.sql` tot en met het hoogste nummer).
3. Installeer dependencies en start de dev-server:

```bash
npm install
npm run dev
```

4. Ga naar `/registreren` om een account aan te maken (gebruikersnaam + wachtwoord, e-mailadres optioneel — enkel nodig om ooit je wachtwoord te kunnen herstellen). Log daarna in via `/login` met je gebruikersnaam.

## Structuur

- `app/` — Next.js App Router pagina's en server actions
- `lib/calculations/` — pure, synchrone rekenfuncties (geen Supabase, geen side-effects)
- `lib/auth/` — sessie, rollen, login-helpers
- `lib/data/` — Supabase-datatoegang
- `lib/logger.ts` — centrale logger (`logs/app.log`, zichtbaar via `/instellingen`)
- `supabase/migrations/` — SQL-schema, RLS-policies en SECURITY DEFINER-functies
- `supabase/break-glass/` — handmatige, niet-automatisch-uitgevoerde rollback-scripts
