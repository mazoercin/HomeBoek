import { logger } from "@/lib/logger";
import type { InkomenFrequentie } from "@/types/database";
import type { InkomenInput } from "./types";

/**
 * Rekenfactor om een inkomenspost om te zetten naar een gemiddeld
 * MAANDbedrag, ongeacht hoe vaak hij echt binnenkomt:
 * - wekelijks: × 4 (eenvoudige, vaste vuistregel — geen exacte
 *   weken-per-maand-telling, bewust gekozen voor voorspelbaarheid)
 * - maandelijks: × 1
 * - 3-/6-maandelijks/jaarlijks: gedeeld door het aantal maanden,
 *   zodat elke maand evenveel bijdraagt i.p.v. een lump sum te tonen
 *   in slechts één specifieke maand.
 */
const FREQUENTIE_FACTOR: Record<InkomenFrequentie, number> = {
  wekelijks: 4,
  maandelijks: 1,
  "3-maandelijks": 1 / 3,
  "6-maandelijks": 1 / 6,
  jaarlijks: 1 / 12,
};

/**
 * Berekent het totale inkomen voor een gegeven maand.
 *
 * Formule: som(inkomen × frequentiefactor) + som(extra inkomen
 *          expliciet ingevoerd voor deze maand)
 *
 * Voorbeeld: loon €2400 (maandelijks) + kindergeld €185 (maandelijks)
 * + freelance-opdracht €90 (wekelijks × 4 = €360) + extra premie €200
 * deze maand = €3145.
 *
 * Fallback: bij een ongeldige frequentie of corrupte data wordt dat
 * item overgeslagen (niet meegeteld), een CALC_001-logregel
 * geschreven, en de berekening gaat door met de rest — één slechte
 * rij mag nooit het hele dashboard breken.
 */
export function berekenTotaalInkomen(input: InkomenInput): number {
  let totaal = 0;

  for (const post of input.inkomen) {
    try {
      if (!Number.isFinite(post.bedrag) || post.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor inkomen: ${post.bedrag}`);
      }
      const factor = FREQUENTIE_FACTOR[post.frequentie];
      if (!factor) {
        throw new Error(`Ongeldige frequentie: ${post.frequentie}`);
      }
      totaal += post.bedrag * factor;
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Inkomenspost overgeslagen door ongeldige data",
        context: { itemId: post.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  for (const post of input.extraInkomen) {
    try {
      if (!Number.isFinite(post.bedrag) || post.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor extra inkomen: ${post.bedrag}`);
      }
      if (post.maand === input.maand) {
        totaal += post.bedrag;
      }
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Extra inkomen overgeslagen door ongeldige data",
        context: { itemId: post.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return totaal;
}

/** Het gemiddelde maandbedrag van één inkomenspost — herbruikt in grafieken en overzichten. */
export function berekenMaandequivalent(bedrag: number, frequentie: InkomenFrequentie): number {
  return bedrag * (FREQUENTIE_FACTOR[frequentie] ?? 0);
}
