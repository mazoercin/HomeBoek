import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

/**
 * Supabase-client voor gebruik in Server Components, Server Actions en
 * Route Handlers. Gebruikt de publieke anon-key: RLS-policies in
 * Supabase bepalen de eigenlijke toegang, deze client praat namens de
 * ingelogde sessie (via cookies), nooit met verhoogde rechten.
 */
export function maakServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // In een Server Component (geen Server Action/Route Handler)
            // kan de cookie niet geschreven worden — dat is verwacht
            // gedrag zolang middleware de sessie ververst.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Zie opmerking hierboven.
          }
        },
      },
    }
  );
}

/**
 * Supabase-client met de service-role key — omzeilt RLS. Enkel gebruiken
 * in vertrouwde server-only code (bv. het automatisch aanmaken van de
 * eerste admin-gebruiker), nooit blootstellen aan de client.
 */
export function maakServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
