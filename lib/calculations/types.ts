import type { Inkomen, ExtraInkomen, VasteKost, Factuur, ExtraUitgave, Doel } from "@/types/database";

/** Status van een vaste kost/factuur voor één specifieke maand. */
export interface BetaaldStatus {
  itemId: string;
  maand: string;
  betaald: boolean;
}

export interface InkomenInput {
  inkomen: Inkomen[];
  extraInkomen: ExtraInkomen[];
  /** De maand waarvoor berekend wordt, als "YYYY-MM". */
  maand: string;
}

export interface UitgavenInput {
  vasteKosten: VasteKost[];
  facturen: Factuur[];
  extraUitgaven: ExtraUitgave[];
  /** IDs van extra_uitgaven die voor `maand` bewust geskipt zijn. */
  geskipteUitgaveIds: string[];
  maand: string;
}

export interface NogTeBetalenInput extends UitgavenInput {
  vasteKostenBetaald: BetaaldStatus[];
  facturenBetaald: BetaaldStatus[];
}

export interface Voorstel {
  type: "pauzeer_uitgave" | "pauzeer_doel" | "informatief";
  titel: string;
  toelichting: string;
  besparing: number;
  /** Aanwezig bij klikbare voorstellen (type pauzeer_*), zodat de UI weet wat toe te passen. */
  itemId?: string;
}
