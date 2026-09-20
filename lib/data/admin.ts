import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { isNepEmail } from "@/lib/auth/nep-email";
import type { HouseholdRol } from "@/types/database";

export interface AdminGebruikersRij {
  userId: string;
  gebruikersnaam: string;
  /** null bij een nep-adres (intern, door de eigenaar aangemaakt account zonder eigen e-mailadres) — nooit het nep-adres zelf tonen. */
  email: string | null;
  aangemaaktOp: string;
  huishoudenNaam: string | null;
  rol: HouseholdRol | null;
  lidSinds: string | null;
}

/**
 * Alle geregistreerde accounts, voor de admin-gebruikerslijst — bewust
 * de service-client (dit overstijgt één huishouden, RLS zou hier enkel
 * het eigen huishouden tonen). Enkel bereikbaar via requireAdmin().
 *
 * Losse queries i.p.v. een PostgREST-embed: household_members.user_id en
 * profiles.user_id refereren allebei onafhankelijk naar auth.users(id),
 * zonder rechtstreekse FK ertussen — zelfde reden als
 * lib/data/household.ts.
 */
export async function haalAlleGebruikers(): Promise<AdminGebruikersRij[]> {
  const supabase = maakServiceClient();

  const [profielenRes, ledenRes, huishoudensRes] = await Promise.all([
    supabase.from("profiles").select("user_id, gebruikersnaam, email, created_at").order("created_at"),
    supabase.from("household_members").select("user_id, household_id, role, joined_at"),
    supabase.from("households").select("id, name"),
  ]);

  const eersteFout = [profielenRes, ledenRes, huishoudensRes].find((r) => r.error);
  if (eersteFout?.error) {
    logger.error({ code: "DB_001", message: "Kon admin-gebruikerslijst niet ophalen", context: { error: eersteFout.error.message } });
    return [];
  }

  const huishoudenNaamPerId = new Map((huishoudensRes.data ?? []).map((h) => [h.id as string, h.name as string]));
  const lidPerGebruiker = new Map((ledenRes.data ?? []).map((l) => [l.user_id as string, l]));

  return (profielenRes.data ?? []).map((p) => {
    const lid = lidPerGebruiker.get(p.user_id as string);
    return {
      userId: p.user_id as string,
      gebruikersnaam: p.gebruikersnaam as string,
      email: isNepEmail(p.email as string) ? null : (p.email as string),
      aangemaaktOp: p.created_at as string,
      huishoudenNaam: lid ? (huishoudenNaamPerId.get(lid.household_id as string) ?? null) : null,
      rol: lid ? (lid.role as HouseholdRol) : null,
      lidSinds: lid ? (lid.joined_at as string) : null,
    };
  });
}
