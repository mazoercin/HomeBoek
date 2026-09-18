import { logger } from "@/lib/logger";
import type { FlexibelInterval } from "@/types/database";
import type { InkomenInput } from "./types";

const INTERVAL_MAANDEN: Record<FlexibelInterval, number> = {
  maandelijks: 1,
  "2-maandelijks": 2,
  "3-maandelijks": 3,
  halfjaarlijks: 6,
  jaarlijks: 12,
};

function maandIndex(sleutel: string): number {
  const [jaarStr, maandStr] = sleutel.split("-");
  return Number(jaarStr) * 12 + (Number(maandStr) - 1);
}

/**
 * Bepaalt of een flexibel-inkomenpost in `maand` verwacht wordt,
 * uitgaande van `volgende_datum` als anker en het herhalingsinterval.
 * Voorbeeld: interval "3-maandelijks", volgende_datum in januari →
 * valt ook in april, juli, oktober, en (terugtellend) in oktober vorig
 * jaar — elke maand waarvan het aantal maanden verschil met het anker
 * deelbaar is door het interval.
 */
function valtInMaand(volgendeDatum: string, interval: FlexibelInterval, maand: string): boolean {
  const ankerSleutel = volgendeDatum.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
  const verschil = maandIndex(maand) - maandIndex(ankerSleutel);
  const intervalMaanden = INTERVAL_MAANDEN[interval];
  if (!intervalMaanden) return false;
  return ((verschil % intervalMaanden) + intervalMaanden) % intervalMaanden === 0;
}

/**
 * Berekent het totale inkomen voor een gegeven maand.
 *
 * Formule: som(vast inkomen)
 *        + som(flexibel inkomen dat deze maand verwacht wordt,
 *              o.b.v. interval + volgende_datum)
 *        + som(extra inkomen expliciet ingevoerd voor deze maand)
 *
 * Voorbeeld: vast €5000 + flexibel (om de 3 maanden €180, deze maand
 * van toepassing) + extra (€200 premie deze maand) = €5380
 *
 * Fallback: bij een ongeldige interval-waarde of corrupte data wordt
 * dat item overgeslagen (niet meegeteld), een CALC_001-logregel
 * geschreven, en de berekening gaat door met de rest — één slechte
 * rij mag nooit het hele dashboard breken.
 */
export function berekenTotaalInkomen(input: InkomenInput): number {
  let totaal = 0;

  for (const post of input.vastInkomen) {
    try {
      if (!Number.isFinite(post.bedrag) || post.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor vast inkomen: ${post.bedrag}`);
      }
      totaal += post.bedrag;
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Vast inkomen overgeslagen door ongeldige data",
        context: { itemId: post.id, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  for (const post of input.flexibelInkomen) {
    try {
      if (!Number.isFinite(post.bedrag) || post.bedrag < 0) {
        throw new Error(`Ongeldig bedrag voor flexibel inkomen: ${post.bedrag}`);
      }
      if (!INTERVAL_MAANDEN[post.interval]) {
        throw new Error(`Ongeldige interval-waarde: ${post.interval}`);
      }
      if (valtInMaand(post.volgende_datum, post.interval, input.maand)) {
        totaal += post.bedrag;
      }
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Flexibel inkomen overgeslagen door ongeldige data",
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
