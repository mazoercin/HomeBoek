import { berekenInkomenMaandbedrag } from "./inkomen";
import type { InkomenInput } from "./types";
import type { ExtraUitgave } from "@/types/database";

/**
 * Maaltijdcheques vormen een apart budget, los van het gewone geld:
 * het bedrag komt nooit op de bankrekening terecht, en kan enkel besteed
 * worden aan uitgaven die je zelf als "betaald met maaltijdcheque"
 * merkt. Deze drie functies horen samen: ontvangen − besteed = over.
 */

/** Som van de maandbedragen van alle inkomensposten met bron 'maaltijdcheques' (zelfde omrekenlogica als gewoon inkomen, incl. weekbedragen). */
export function berekenMaaltijdchequesOntvangen(input: Pick<InkomenInput, "inkomen" | "weekBedragen">): number {
  let totaal = 0;
  for (const post of input.inkomen) {
    if (post.bron !== "maaltijdcheques") continue;
    try {
      totaal += berekenInkomenMaandbedrag(post, input.weekBedragen);
    } catch {
      // Corrupte rij: negeren, net als berekenTotaalInkomen — geen aparte
      // logregel nodig, berekenTotaalInkomen loopt over dezelfde data.
    }
  }
  return totaal;
}

/** Som van de niet-geskipte extra uitgaven die met maaltijdcheques betaald zijn. */
export function berekenMaaltijdchequesBesteed(extraUitgaven: ExtraUitgave[]): number {
  let totaal = 0;
  for (const uitgave of extraUitgaven) {
    if (uitgave.betaalmethode !== "maaltijdcheque" || uitgave.geskipt) continue;
    if (!Number.isFinite(uitgave.bedrag) || uitgave.bedrag < 0) continue;
    totaal += uitgave.bedrag;
  }
  return totaal;
}

/** Wat er nog over is: ontvangen − besteed. Kan negatief worden (meer besteed dan ontvangen). */
export function berekenMaaltijdchequesOver(ontvangen: number, besteed: number): number {
  return ontvangen - besteed;
}
