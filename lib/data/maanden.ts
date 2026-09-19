import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { maandSleutel } from "@/lib/calculations/maand";
import type { DashboardMaand } from "@/types/database";

/** Alle geregistreerde maanden van dit huishouden, oudste eerst — bepaalt wat de kalender/overzichtspagina toont. */
export async function haalGeregistreerdeMaanden(householdId: string): Promise<DashboardMaand[]> {
  const supabase = maakServerClient();
  const { data, error } = await supabase
    .from("dashboard_maanden")
    .select("*")
    .eq("household_id", householdId)
    .order("maand");

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon geregistreerde maanden niet ophalen",
      context: { householdId, error: error.message },
    });
    return [];
  }

  return (data ?? []) as DashboardMaand[];
}

/**
 * Welke maand het dashboard moet tonen als er geen specifieke maand in
 * de URL staat: de meest recente geregistreerde maand, of — als er nog
 * nooit een maand geregistreerd is (net gestart huishouden) — gewoon
 * de echte huidige kalendermaand.
 */
export async function haalStandaardMaand(householdId: string): Promise<string> {
  const maanden = await haalGeregistreerdeMaanden(householdId);
  const laatste = maanden[maanden.length - 1];
  return laatste ? laatste.maand : maandSleutel(new Date());
}
