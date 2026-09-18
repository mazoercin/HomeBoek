/**
 * watOverblijft = totaalInkomen - openstaandBedrag
 * Positief (incl. 0) = groen, negatief = rood.
 *
 * Voorbeeld: totaalInkomen €5380, openstaandBedrag €4900 → €480 over (groen).
 */
export function berekenWatOverblijft(totaalInkomen: number, openstaandBedrag: number): number {
  return totaalInkomen - openstaandBedrag;
}

export function isPositief(watOverblijft: number): boolean {
  return watOverblijft >= 0;
}
