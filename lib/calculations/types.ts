import type { Inkomen, ExtraInkomen, InkomenWeekBedrag, VasteKost, Factuur, ExtraUitgave, Doel } from "@/types/database";

export interface InkomenInput {
  inkomen: Inkomen[];
  extraInkomen: ExtraInkomen[];
  /**
   * Optionele per-week bedragen voor wekelijkse inkomensposten (zie
   * InkomenWeekBedrag) — enkel items met `inkomen_id` gelijk aan een
   * post uit `inkomen` tellen mee, dus gerust de volledige lijst van
   * het huishouden meegeven (geen voorfiltering per maand nodig).
   */
  weekBedragen: InkomenWeekBedrag[];
  /** De maand waarvoor berekend wordt, als "YYYY-MM". */
  maand: string;
}

/**
 * Alle items horen hier al bij één specifieke maand (elke rij draagt
 * zijn eigen `maand`/`betaald`/`geskipt`) — deze functies filteren
 * dus niet langer zelf op maand, ze sommeren gewoon wat je meegeeft.
 */
export interface UitgavenInput {
  vasteKosten: VasteKost[];
  facturen: Factuur[];
  extraUitgaven: ExtraUitgave[];
}

export interface Voorstel {
  type: "pauzeer_uitgave" | "pauzeer_doel" | "informatief";
  titel: string;
  toelichting: string;
  besparing: number;
  /** Aanwezig bij klikbare voorstellen (type pauzeer_*), zodat de UI weet wat toe te passen. */
  itemId?: string;
}
