import type { ExtraUitgave, Doel, VasteKost, Factuur } from "@/types/database";
import type { Voorstel } from "./types";

export interface VoorstellenInput {
  tekort: number; // positief getal = hoeveel er tekort is
  extraUitgaven: ExtraUitgave[];
  geskipteUitgaveIds: string[];
  doelen: Doel[];
  vasteKosten: VasteKost[];
  facturen: Factuur[];
}

/**
 * Voorstellen bij een tekort, in vaste volgorde:
 * 1) overslaanbare extra uitgaven pauzeren (grootste bedrag eerst,
 *    grootste impact om snelst uit het rood te komen)
 * 2) laagst-geprioriteerde, actieve doelen pauzeren
 * 3) informatief voorstel (GEEN actie-knop) om uitstel/vermindering/
 *    afbetalingsplan te vragen voor de grootste vaste kosten/facturen —
 *    deze worden NOOIT als "stopbaar" voorgesteld, enkel manueel
 *    bewerken/verwijderen is mogelijk via de kaarten zelf
 */
export function genereerVoorstellenBijTekort(input: VoorstellenInput): Voorstel[] {
  if (input.tekort <= 0) return [];

  const voorstellen: Voorstel[] = [];

  const pauzeerbareUitgaven = input.extraUitgaven
    .filter((u) => u.overslaanbaar && !input.geskipteUitgaveIds.includes(u.id))
    .sort((a, b) => b.bedrag - a.bedrag);

  for (const uitgave of pauzeerbareUitgaven) {
    voorstellen.push({
      type: "pauzeer_uitgave",
      titel: `Pauzeer "${uitgave.label}"`,
      toelichting: `Bespaart €${uitgave.bedrag.toFixed(2)} deze maand.`,
      besparing: uitgave.bedrag,
      itemId: uitgave.id,
    });
  }

  const pauzeerbareDoelen = input.doelen
    .filter((d) => !d.gepauzeerd && d.maandelijks_bedrag > 0)
    .sort((a, b) => b.prioriteit - a.prioriteit); // hoogste prioriteit-getal = laagst geprioriteerd

  for (const doel of pauzeerbareDoelen) {
    voorstellen.push({
      type: "pauzeer_doel",
      titel: `Pauzeer sparen voor "${doel.naam}"`,
      toelichting: `Bespaart €${doel.maandelijks_bedrag.toFixed(2)}/maand, doel duurt wel langer.`,
      besparing: doel.maandelijks_bedrag,
      itemId: doel.id,
    });
  }

  const grootsteVasteLasten = [...input.vasteKosten, ...input.facturen]
    .sort((a, b) => b.bedrag - a.bedrag)
    .slice(0, 3);

  for (const last of grootsteVasteLasten) {
    voorstellen.push({
      type: "informatief",
      titel: `Overweeg uitstel of vermindering voor "${last.label}"`,
      toelichting:
        "Neem contact op met de aanbieder voor een afbetalingsplan of vermindering. Dit kan niet automatisch gepauzeerd worden.",
      besparing: 0,
    });
  }

  return voorstellen;
}
