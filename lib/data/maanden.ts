import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { maandSleutel } from "@/lib/calculations/maand";
import type { DashboardMaand } from "@/types/database";

/** Alle geregistreerde maanden, oudste eerst — bepaalt wat de kalender/overzichtspagina toont. */
export async function haalGeregistreerdeMaanden(): Promise<DashboardMaand[]> {
  const supabase = maakServiceClient();
  const { data, error } = await supabase.from("dashboard_maanden").select("*").order("maand");

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon geregistreerde maanden niet ophalen",
      context: { error: error.message },
    });
    return [];
  }

  return (data ?? []) as DashboardMaand[];
}

/**
 * Welke maand het dashboard moet tonen als er geen specifieke maand in
 * de URL staat: de meest recente geregistreerde maand, of — als er nog
 * nooit een maand geregistreerd is (nieuwe/lege installatie) — gewoon
 * de echte huidige kalendermaand.
 */
export async function haalStandaardMaand(): Promise<string> {
  const maanden = await haalGeregistreerdeMaanden();
  const laatste = maanden[maanden.length - 1];
  return laatste ? laatste.maand : maandSleutel(new Date());
}
