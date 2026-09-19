"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-client voor gebruik in de browser — enkel nodig voor de
 * wachtwoord-herstellen-pagina, die de recovery-sessie uit de e-mail-
 * link (URL-hash) moet oppikken vóór er een nieuw wachtwoord gezet kan
 * worden. Verder gebruikt de app overal de server-clients.
 */
export function maakBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
