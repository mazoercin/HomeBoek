/**
 * Gedeelde TypeScript-types voor alle Supabase-tabellen.
 * Eén bron van waarheid zodat berekeningen, formulieren en UI nooit
 * `any` hoeven te gebruiken en een schema-wijziging op één plek zichtbaar is.
 */

export type Rol = "admin" | "lid";

export interface Gebruiker {
  id: string;
  gebruikersnaam: string;
  rol: Rol;
  created_at: string;
  updated_at: string;
}

export type FlexibelInterval =
  | "maandelijks"
  | "2-maandelijks"
  | "3-maandelijks"
  | "halfjaarlijks"
  | "jaarlijks";

export type InkomenBron = "zelf" | "partner" | "ander";

export interface VastInkomen {
  id: string;
  bron: InkomenBron;
  label: string;
  bedrag: number;
  created_at: string;
  updated_at: string;
}

export interface FlexibelInkomen {
  id: string;
  bron: InkomenBron;
  label: string;
  bedrag: number;
  interval: FlexibelInterval;
  volgende_datum: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface ExtraInkomen {
  id: string;
  label: string;
  bedrag: number;
  maand: string; // YYYY-MM
  created_at: string;
  updated_at: string;
}

export type Categorie =
  | "huis"
  | "energie"
  | "mazout_gas"
  | "water"
  | "internet"
  | "verzekering"
  | "krediet"
  | "andere";

export interface VasteKost {
  id: string;
  label: string;
  bedrag: number;
  categorie: Categorie;
  icoon: string;
  vervaldag: number | null; // 1-31
  eind_datum: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface VasteKostBetaald {
  id: string;
  vaste_kost_id: string;
  maand: string; // YYYY-MM
  betaald: boolean;
  created_at: string;
  updated_at: string;
}

export interface Factuur {
  id: string;
  label: string;
  bedrag: number;
  categorie: Categorie;
  icoon: string;
  vervaldag: number | null;
  eind_datum: string | null;
  created_at: string;
  updated_at: string;
}

export interface FactuurBetaald {
  id: string;
  factuur_id: string;
  maand: string;
  betaald: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtraUitgave {
  id: string;
  label: string;
  bedrag: number;
  overslaanbaar: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeskipteUitgave {
  id: string;
  extra_uitgave_id: string;
  maand: string; // YYYY-MM
  created_at: string;
}

export interface Doel {
  id: string;
  naam: string;
  target_bedrag: number;
  maandelijks_bedrag: number;
  prioriteit: number;
  gepauzeerd: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoudTransactie {
  id: string;
  bedrag: number;
  datum: string; // YYYY-MM-DD
  notitie: string | null;
  created_at: string;
}

/** Categorie → icoon + korte uitleg, gebruikt voor kaarten en formulieren. */
export const CATEGORIE_INFO: Record<Categorie, { icoon: string; label: string }> = {
  huis: { icoon: "🏠", label: "Huur / hypotheek / bouwlening" },
  energie: { icoon: "⚡", label: "Elektriciteit" },
  mazout_gas: { icoon: "🛢️", label: "Verwarming" },
  water: { icoon: "💧", label: "Water" },
  internet: { icoon: "🌐", label: "Internet / TV" },
  verzekering: { icoon: "🛡️", label: "Verzekering" },
  krediet: { icoon: "💳", label: "Lening / krediet" },
  andere: { icoon: "📄", label: "Andere vaste kost" },
};
