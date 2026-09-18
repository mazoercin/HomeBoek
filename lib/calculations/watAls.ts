import { logger } from "@/lib/logger";
import type { ExtraUitgave } from "@/types/database";

export interface WatAlsResultaat {
  besparing: number;
  nieuwSaldo: number;
}

/**
 * "Wat als?"-simulatie: gegeven een set aangevinkte, overslaanbare
 * extra uitgaven, bereken de besparing en het nieuwe overblijvende
 * bedrag ZONDER de echte skip-status te wijzigen (puur preview,
 * client-side state, geen database-write tot expliciete bevestiging).
 *
 * Voorbeeld: huidig saldo -€50, aangevinkt "Kapper €40" + "Autowas
 * €15" → besparing €55, nieuwSaldo €5 (terug in het groen).
 */
export function simuleerWatAls(
  huidigWatOverblijft: number,
  aangevinkteUitgaven: ExtraUitgave[],
  aangevinkteIds: string[]
): WatAlsResultaat {
  let besparing = 0;

  for (const uitgave of aangevinkteUitgaven) {
    if (!aangevinkteIds.includes(uitgave.id)) continue;
    try {
      if (!uitgave.overslaanbaar) {
        throw new Error("Niet-overslaanbare uitgave kan niet gesimuleerd worden");
      }
      if (!Number.isFinite(uitgave.bedrag) || uitgave.bedrag < 0) {
        throw new Error(`Ongeldig bedrag: ${uitgave.bedrag}`);
      }
      besparing += uitgave.bedrag;
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Extra uitgave overgeslagen in wat-als-simulatie",
        context: { itemId: uitgave.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return { besparing, nieuwSaldo: huidigWatOverblijft + besparing };
}
