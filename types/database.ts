/**
 * Gedeelde TypeScript-types voor alle Supabase-tabellen.
 * Eén bron van waarheid zodat berekeningen, formulieren en UI nooit
 * `any` hoeven te gebruiken en een schema-wijziging op één plek zichtbaar is.
 */

export interface Profiel {
  user_id: string;
  email: string;
  gebruikersnaam: string;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

/** Rol binnen één huishouden — vervangt de vroegere globale admin/lid-rol. */
export type HouseholdRol = "owner" | "editor" | "viewer";

export interface HouseholdLid {
  household_id: string;
  user_id: string;
  role: HouseholdRol;
  display_name: string | null;
  joined_at: string;
  invited_by: string | null;
}

/** Gemeenschappelijke metadata-kolommen die elke budgettabel nu draagt (server-side via trigger gezet). */
interface HuishoudenRij {
  household_id: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
}

/**
 * Hoe vaak een inkomenspost binnenkomt. Elke post draagt elke maand
 * hetzelfde, gemiddelde maandbedrag bij (bedrag × frequentiefactor) —
 * zie lib/calculations/inkomen.ts voor de exacte formule per waarde.
 */
export type InkomenFrequentie = "wekelijks" | "maandelijks" | "3-maandelijks" | "6-maandelijks" | "jaarlijks";

/**
 * "maaltijdcheques" is geen gewoon inkomen: dat bedrag komt nooit op de
 * bankrekening terecht en telt dus niet mee in het gewone totaalinkomen
 * (zie berekenTotaalInkomen) — het voedt enkel het aparte
 * maaltijdcheques-budget (zie lib/calculations/maaltijdcheques.ts).
 */
export type InkomenBron = "zelf" | "partner" | "ander" | "maaltijdcheques";

export interface Inkomen extends HuishoudenRij {
  id: string;
  bron: InkomenBron;
  label: string;
  bedrag: number;
  frequentie: InkomenFrequentie;
  maand: string; // YYYY-MM — elke maand heeft zijn eigen, onafhankelijke inkomenslijst
  created_at: string;
  updated_at: string;
}

/**
 * Optioneel, enkel bij frequentie 'wekelijks': een apart bedrag per
 * week (1-4) i.p.v. één vast bedrag × 4 — voor inkomen dat elke week
 * anders is. Zolang hier niets voor bestaat, blijft de gewone
 * bedrag × 4-vuistregel gelden (zie lib/calculations/inkomen.ts).
 */
export interface InkomenWeekBedrag extends HuishoudenRij {
  id: string;
  inkomen_id: string;
  week_nummer: number;
  bedrag: number;
  created_at: string;
  updated_at: string;
}

export interface ExtraInkomen extends HuishoudenRij {
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

export interface VasteKost extends HuishoudenRij {
  id: string;
  label: string;
  bedrag: number;
  categorie: Categorie;
  icoon: string;
  vervaldag: number | null; // 1-31
  eind_datum: string | null; // YYYY-MM-DD
  maand: string; // YYYY-MM
  betaald: boolean;
  created_at: string;
  updated_at: string;
}

export interface Factuur extends HuishoudenRij {
  id: string;
  label: string;
  bedrag: number;
  categorie: Categorie;
  icoon: string;
  vervaldag: number | null;
  eind_datum: string | null;
  maand: string; // YYYY-MM
  betaald: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Waarmee een extra uitgave betaald werd. "Visa" (kredietkaart) is hier
 * bewust GEEN waarde: zo'n uitgave wordt meteen als Factuur aangemaakt
 * (categorie "krediet") in plaats van als extra_uitgaven-rij, want dat
 * bedrag moet nog terugbetaald worden aan de kaart — dat hoort bij
 * "openstaand", niet bij "al uitgegeven".
 */
export type Betaalmethode = "bankkaart" | "maaltijdcheque";

export interface ExtraUitgave extends HuishoudenRij {
  id: string;
  label: string;
  bedrag: number;
  overslaanbaar: boolean;
  maand: string; // YYYY-MM
  geskipt: boolean;
  /**
   * "maaltijdcheque" trekt af van het aparte maaltijdcheques-budget i.p.v.
   * het gewone geld-saldo (zie lib/calculations/uitgaven.ts en
   * lib/calculations/maaltijdcheques.ts) — dat geld kwam nooit van de
   * bankrekening, dus het mag het "wat overblijft"-bedrag niet verlagen.
   */
  betaalmethode: Betaalmethode;
  created_at: string;
  updated_at: string;
}

export interface Doel extends HuishoudenRij {
  id: string;
  naam: string;
  target_bedrag: number;
  maandelijks_bedrag: number;
  prioriteit: number;
  gepauzeerd: boolean;
  created_at: string;
  updated_at: string;
}

export interface Investering extends HuishoudenRij {
  id: string;
  naam: string;
  created_at: string;
}

export interface InvesteringTransactie extends HuishoudenRij {
  id: string;
  investering_id: string;
  bedrag: number;
  datum: string; // YYYY-MM-DD
  notitie: string | null;
  created_at: string;
}

export interface DoelBijdrage extends HuishoudenRij {
  id: string;
  doel_id: string;
  bedrag: number;
  datum: string; // YYYY-MM-DD
  notitie: string | null;
  /** Telt dit bedrag mee als afgetrokken van het inkomen van de maand van `datum`? */
  aftrekken_van_inkomen: boolean;
  created_at: string;
}

export interface DashboardMaand extends HuishoudenRij {
  maand: string; // YYYY-MM
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
