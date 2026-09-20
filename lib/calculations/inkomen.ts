import { logger } from "@/lib/logger";
import type { Inkomen, InkomenFrequentie, InkomenWeekBedrag } from "@/types/database";
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
 * Som van de ingevulde weekbedragen voor één inkomenspost — enkel
 * relevant bij frequentie 'wekelijks'. `null` als er nog geen enkel
 * weekbedrag voor deze post is ingevuld, zodat de aanroeper dan op de
 * gewone bedrag × 4-vuistregel kan terugvallen i.p.v. onterecht €0 te
 * tonen. Negatieve of ontbrekende bedragen worden overgeslagen, niet
 * de hele post — één foute week mag de rest niet wegvegen.
 */
function somWeekbedragen(inkomenId: string, weekBedragen: InkomenWeekBedrag[]): number | null {
  const relevant = weekBedragen.filter((w) => w.inkomen_id === inkomenId && Number.isFinite(w.bedrag) && w.bedrag >= 0);
  if (relevant.length === 0) return null;
  return relevant.reduce((som, w) => som + w.bedrag, 0);
}

/**
 * Het maandbedrag van één inkomenspost: bij 'wekelijks' mét ingevulde
 * weekbedragen de som daarvan, anders de gewone bedrag ×
 * frequentiefactor-vuistregel. Gedeeld door de totaalberekening en de
 * UI (lijst-weergave, grafieken) zodat ze nooit uit sync kunnen raken.
 * Gooit bij ongeldige data (zelfde contract als voorheen) — de
 * aanroeper vangt dit desgewenst af, `berekenTotaalInkomen` doet dat al.
 */
export function berekenInkomenMaandbedrag(post: Inkomen, weekBedragen: InkomenWeekBedrag[]): number {
  if (!Number.isFinite(post.bedrag) || post.bedrag < 0) {
    throw new Error(`Ongeldig bedrag voor inkomen: ${post.bedrag}`);
  }
  const factor = FREQUENTIE_FACTOR[post.frequentie];
  if (!factor) {
    throw new Error(`Ongeldige frequentie: ${post.frequentie}`);
  }

  const weeksom = post.frequentie === "wekelijks" ? somWeekbedragen(post.id, weekBedragen) : null;
  return weeksom !== null ? weeksom : post.bedrag * factor;
}

/**
 * Berekent het totale inkomen voor een gegeven maand.
 *
 * Formule: som(maandbedrag per inkomenspost, zie
 *          berekenInkomenMaandbedrag) + som(extra inkomen expliciet
 *          ingevoerd voor deze maand)
 *
 * Voorbeeld: loon €2400 (maandelijks) + kindergeld €185 (maandelijks)
 * + freelance-opdracht €90 (wekelijks × 4 = €360, geen weekbedragen
 * ingevuld) + extra premie €200 deze maand = €3145.
 *
 * Fallback: bij een ongeldige frequentie of corrupte data wordt dat
 * item overgeslagen (niet meegeteld), een CALC_001-logregel
 * geschreven, en de berekening gaat door met de rest — één slechte
 * rij mag nooit het hele dashboard breken.
 *
 * Inkomen met bron 'maaltijdcheques' telt hier NIET mee: dat geld komt
 * nooit op de bankrekening terecht, het voedt enkel het aparte
 * maaltijdcheques-budget (zie lib/calculations/maaltijdcheques.ts).
 */
export function berekenTotaalInkomen(input: InkomenInput): number {
  let totaal = 0;

  for (const post of input.inkomen) {
    if (post.bron === "maaltijdcheques") continue;
    try {
      totaal += berekenInkomenMaandbedrag(post, input.weekBedragen);
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
