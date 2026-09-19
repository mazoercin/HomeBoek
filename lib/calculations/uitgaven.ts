import { logger } from "@/lib/logger";
import type { UitgavenInput } from "./types";

/**
 * Berekent het openstaand bedrag: alle vaste kosten + facturen +
 * niet-geskipte extra uitgaven van de meegegeven maand, ongeacht
 * betaald-status. De caller haalt de items al gefilterd op maand op
 * (elke rij hoort bij precies één maand), dus hier wordt niet nog
 * eens op maand gefilterd.
 */
export function berekenOpenstaandBedrag(input: UitgavenInput): number {
  let totaal = 0;

  for (const kost of input.vasteKosten) {
    try {
      if (!Number.isFinite(kost.bedrag) || kost.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor vaste kost: ${kost.bedrag}`);
      }
      totaal += kost.bedrag;
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Vaste kost overgeslagen door ongeldige data",
        context: { itemId: kost.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  for (const factuur of input.facturen) {
    try {
      if (!Number.isFinite(factuur.bedrag) || factuur.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor factuur: ${factuur.bedrag}`);
      }
      totaal += factuur.bedrag;
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Factuur overgeslagen door ongeldige data",
        context: { itemId: factuur.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  for (const uitgave of input.extraUitgaven) {
    try {
      if (!Number.isFinite(uitgave.bedrag) || uitgave.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor extra uitgave: ${uitgave.bedrag}`);
      }
      if (!uitgave.geskipt) {
        totaal += uitgave.bedrag;
      }
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Extra uitgave overgeslagen door ongeldige data",
        context: { itemId: uitgave.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return totaal;
}

/**
 * Berekent hoeveel er nog betaald moet worden: som van vaste kosten +
 * facturen die niet op "betaald" staan. Extra uitgaven hebben geen
 * betaald-status (enkel skip), en tellen hier dus niet in mee.
 */
export function berekenNogTeBetalen(input: Pick<UitgavenInput, "vasteKosten" | "facturen">): number {
  let totaal = 0;

  for (const kost of input.vasteKosten) {
    try {
      if (kost.betaald) continue;
      if (!Number.isFinite(kost.bedrag) || kost.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor vaste kost: ${kost.bedrag}`);
      }
      totaal += kost.bedrag;
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Vaste kost overgeslagen bij nog-te-betalen door ongeldige data",
        context: { itemId: kost.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  for (const factuur of input.facturen) {
    try {
      if (factuur.betaald) continue;
      if (!Number.isFinite(factuur.bedrag) || factuur.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor factuur: ${factuur.bedrag}`);
      }
      totaal += factuur.bedrag;
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Factuur overgeslagen bij nog-te-betalen door ongeldige data",
        context: { itemId: factuur.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return totaal;
}
