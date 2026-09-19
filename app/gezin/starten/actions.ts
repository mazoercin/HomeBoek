"use server";

import { maakServerClient } from "@/lib/supabase/server";
import { requireSessie } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger.server";

/**
 * Maakt een nieuw huishouden aan met de huidige gebruiker als owner
 * (atomische RPC). Stuurt bewust NIET zelf door: de aanroeper (client)
 * moet eerst nog de kans krijgen om eventuele lokale gast-data te
 * importeren vóór de navigatie naar /dashboard — zie StartHouseholdForm.
 */
export async function startNieuwHousehold(naam: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const sessie = await requireSessie();
  const supabase = maakServerClient();

  const naamGetrimd = naam.trim() || "Ons gezin";

  const { error } = await supabase.rpc("create_household", { p_name: naamGetrimd });

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon huishouden niet aanmaken",
      context: { gebruikerId: sessie.gebruikerId, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon geen huishouden aanmaken, probeer opnieuw." };
  }

  return { gelukt: true };
}
