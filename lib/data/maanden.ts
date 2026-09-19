import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { huidigeMaandInBrussel } from "@/lib/calculations/maand";
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
 * de URL staat: altijd de échte huidige kalendermaand (Europe/Brussels)
 * — ongeacht welke maand het laatst geregistreerd werd. Is die maand
 * nog niet geregistreerd, dan toont /dashboard/[maand] daar zelf de
 * registratiestap voor.
 */
export function haalStandaardMaand(): string {
  return huidigeMaandInBrussel();
}
