"use server";

import { maakServerClient } from "@/lib/supabase/server";
import { requireSessie } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger.server";

/**
 * Maakt een nieuw huishouden aan met de huidige gebruiker als owner
 * (atomische RPC). Stuurt bewust NIET zelf door: de aanroeper (client)
 * moet eerst nog de kans krijgen om eventuele lokale gast-data te
 * importeren vóór de navigatie naar /dashboard — zie StartHouseholdForm.
 *
 * TIJDELIJK: geeft ook diagnose-info terug (huishoudenId + of een directe
 * her-lezing dat lidmaatschap meteen terugvindt) — hiermee sporen we een
 * probleem op waarbij "Starten" leek te lukken maar je toch weer op de
 * onboardingpagina belandde i.p.v. je dashboard.
 */
export async function startNieuwHousehold(
  naam: string
): Promise<{ gelukt: boolean; foutmelding?: string; huishoudenId?: string; gevondenBijControle?: boolean }> {
  const sessie = await requireSessie();
  const supabase = maakServerClient();

  const naamGetrimd = naam.trim() || "Ons gezin";

  const { data: huishoudenId, error } = await supabase.rpc("create_household", { p_name: naamGetrimd });

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon huishouden niet aanmaken",
      context: { gebruikerId: sessie.gebruikerId, error: error.message },
    });
    return { gelukt: false, foutmelding: `Kon geen huishouden aanmaken: ${error.message}` };
  }

  const { data: controle, error: controleError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", sessie.gebruikerId)
    .maybeSingle();

  logger.warn({
    code: "AUTH_002",
    message: "Diagnose direct na aanmaken huishouden",
    context: {
      gebruikerId: sessie.gebruikerId,
      huishoudenId,
      gevondenBijControle: controle?.household_id ?? null,
      controleError: controleError?.message,
    },
  });

  return {
    gelukt: true,
    huishoudenId: huishoudenId ?? undefined,
    gevondenBijControle: Boolean(controle),
  };
}
