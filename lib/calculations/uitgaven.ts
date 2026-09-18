import { logger } from "@/lib/logger";
import type { UitgavenInput, NogTeBetalenInput } from "./types";

/** Een kost is actief in `maand` als er geen eind_datum is, of de maand niet ná het einde valt. */
function isActiefInMaand(eindDatum: string | null, maand: string): boolean {
  if (!eindDatum) return true;
  const eindMaand = eindDatum.slice(0, 7);
  return maand <= eindMaand;
}

/**
 * Berekent het openstaand bedrag: alle actieve vaste kosten + facturen
 * + niet-geskipte extra uitgaven, ongeacht betaald-status.
 *
 * Een kost telt NIET mee als de maand ná de eind_datum van die kost
 * valt (bv. krediet afbetaald, abonnement opgezegd) — vergelijking
 * gebeurt op "YYYY-MM"-niveau, niet op exacte dag.
 */
export function berekenOpenstaandBedrag(input: UitgavenInput): number {
  let totaal = 0;

  for (const kost of input.vasteKosten) {
    try {
      if (!Number.isFinite(kost.bedrag) || kost.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor vaste kost: ${kost.bedrag}`);
      }
      if (isActiefInMaand(kost.eind_datum, input.maand)) {
        totaal += kost.bedrag;
      }
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
      if (isActiefInMaand(factuur.eind_datum, input.maand)) {
        totaal += factuur.bedrag;
      }
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
      const geskipt = input.geskipteUitgaveIds.includes(uitgave.id);
      if (!geskipt) {
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
 * Berekent hoeveel er nog betaald moet worden: som van actieve vaste
 * kosten + facturen die voor deze maand nog niet op "betaald" staan.
 * Extra uitgaven hebben geen betaald-status (enkel skip), en tellen
 * hier dus niet in mee.
 */
export function berekenNogTeBetalen(input: NogTeBetalenInput): number {
  let totaal = 0;

  for (const kost of input.vasteKosten) {
    try {
      if (!isActiefInMaand(kost.eind_datum, input.maand)) continue;
      const status = input.vasteKostenBetaald.find(
        (s) => s.itemId === kost.id && s.maand === input.maand
      );
      const betaald = status?.betaald ?? false;
      if (!betaald) {
        if (!Number.isFinite(kost.bedrag) || kost.bedrag < 0) {
          throw new Error(`Ongeldig bedrag voor vaste kost: ${kost.bedrag}`);
        }
        totaal += kost.bedrag;
      }
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
      if (!isActiefInMaand(factuur.eind_datum, input.maand)) continue;
      const status = input.facturenBetaald.find(
        (s) => s.itemId === factuur.id && s.maand === input.maand
      );
      const betaald = status?.betaald ?? false;
      if (!betaald) {
        if (!Number.isFinite(factuur.bedrag) || factuur.bedrag < 0) {
          throw new Error(`Ongeldig bedrag voor factuur: ${factuur.bedrag}`);
        }
        totaal += factuur.bedrag;
      }
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
