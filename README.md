# HuisBalans

Gezinsfinanciën overzichtelijk beheren: inkomen, vaste kosten, facturen,
extra uitgaven, doelen en goud-investering, met instant berekeningen.

## Starten

1. Kopieer `.env.example` naar `.env.local` en vul in:
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — inloggegevens voor de enige admin-gebruiker
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — uit je Supabase-project (Settings → API)
   - `SESSION_SECRET` — een lange, willekeurige string
2. Voer de SQL-migraties in `supabase/migrations/` uit in je Supabase-project (SQL editor, in volgorde: `0001_init.sql`, dan `0002_onboarding_rpc.sql`).
3. Installeer dependencies en start de dev-server:

```bash
npm install
npm run dev
```

4. Log in met de `ADMIN_USERNAME`/`ADMIN_PASSWORD` uit je `.env.local`. Bij de eerste login wordt automatisch een admin-gebruiker aangemaakt in de `gebruikers`-tabel, en start de onboarding-wizard.

## Structuur

- `app/` — Next.js App Router pagina's en server actions
- `lib/calculations/` — pure, synchrone rekenfuncties (geen Supabase, geen side-effects)
- `lib/auth/` — sessie, rollen, login-helpers
- `lib/data/` — Supabase-datatoegang
- `lib/logger.ts` — centrale logger (`logs/app.log`, zichtbaar via `/instellingen`)
- `supabase/migrations/` — SQL-schema en de transactionele onboarding-RPC
