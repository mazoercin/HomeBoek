import { logger } from "@/lib/logger";
import type { Doel } from "@/types/database";
import { voegMaandenToe } from "./maand";

export interface DoelProjectie {
  maanden: number | null;
  datum: string | null; // YYYY-MM
}

/**
 * Doel-projectie: aantal maanden tot het doelbedrag bereikt is.
 * Formule: maanden = ceil((target - reeds gespaard) / bedrag per maand)
 *
 * Voorbeeld: target €1200, reeds gespaard €300, €150/maand →
 * ceil(900 / 150) = 6 maanden.
 *
 * Edge case: als maandelijksBedrag <= 0 of het doel gepauzeerd is,
 * retourneert de functie { maanden: null, datum: null } — een deling
 * door 0 wordt bewust vermeden, niet als Infinity/NaN doorgegeven.
 */
export function berekenDoelProjectie(
  doel: Doel,
  reedsGespaard: number,
  vanafMaand: string
): DoelProjectie {
  try {
    if (doel.gepauzeerd || doel.maandelijks_bedrag <= 0) {
      return { maanden: null, datum: null }; // CALC_002: deling door 0 vermeden
    }

    const resterend = doel.target_bedrag - reedsGespaard;
    if (resterend <= 0) {
      return { maanden: 0, datum: vanafMaand };
    }

    const maanden = Math.ceil(resterend / doel.maandelijks_bedrag);
    return { maanden, datum: voegMaandenToe(vanafMaand, maanden) };
  } catch (error) {
    logger.error({
      code: "CALC_002",
      message: "Kon doel-projectie niet berekenen",
      context: { doelId: doel.id, error: error instanceof Error ? error.message : String(error) },
    });
    return { maanden: null, datum: null };
  }
}
