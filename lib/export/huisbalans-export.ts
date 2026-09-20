import { isNepEmail } from "@/lib/auth/nep-email";
import type {
  HouseholdRol,
  InkomenBron,
  InkomenFrequentie,
  Categorie,
} from "@/types/database";

/**
 * Vorm van "Download mijn gegevens" — enkel velden die voor de
 * gebruiker zelf betekenis hebben. Interne kolommen (household_id,
 * created_by, updated_by, version) horen hier bewust niet in: de
 * aanroepende Server Action vraagt ze nooit eens op (expliciete
 * kolomkeuze in de query, niet een filter achteraf). `id` blijft enkel
 * staan waar nodig om onderling te koppelen (bv. doel_bijdragen.doel_id).
 */
export interface HuisbalansExport {
  versie: 1;
  geexporteerd_op: string;
  huishouden: { naam: string; valuta: string };
  /** Enkel het EIGEN profiel — nooit e-mailadressen van anderen. */
  profiel: { gebruikersnaam: string; email: string | null; lid_sinds: string };
  /** De rest van het gezin, zonder jezelf — enkel gebruikersnaam+rol, nooit e-mailadres. */
  gezinsleden: { gebruikersnaam: string; rol: HouseholdRol; lid_sinds: string }[];
  inkomen: {
    id: string;
    bron: InkomenBron;
    label: string;
    bedrag: number;
    frequentie: InkomenFrequentie;
    maand: string;
    created_at: string;
    updated_at: string;
  }[];
  inkomen_weekbedragen: { id: string; inkomen_id: string; week_nummer: number; bedrag: number; created_at: string; updated_at: string }[];
  extra_inkomen: { id: string; label: string; bedrag: number; maand: string; created_at: string; updated_at: string }[];
  vaste_kosten: {
    id: string;
    label: string;
    bedrag: number;
    categorie: Categorie;
    icoon: string;
    vervaldag: number | null;
    eind_datum: string | null;
    maand: string;
    betaald: boolean;
    created_at: string;
    updated_at: string;
  }[];
  facturen: {
    id: string;
    label: string;
    bedrag: number;
    categorie: Categorie;
    icoon: string;
    vervaldag: number | null;
    eind_datum: string | null;
    maand: string;
    betaald: boolean;
    created_at: string;
    updated_at: string;
  }[];
  extra_uitgaven: { id: string; label: string; bedrag: number; overslaanbaar: boolean; maand: string; geskipt: boolean; created_at: string; updated_at: string }[];
  doelen: {
    id: string;
    naam: string;
    target_bedrag: number;
    maandelijks_bedrag: number;
    prioriteit: number;
    gepauzeerd: boolean;
    created_at: string;
    updated_at: string;
  }[];
  doel_bijdragen: { id: string; doel_id: string; bedrag: number; datum: string; notitie: string | null; aftrekken_van_inkomen: boolean; created_at: string }[];
  investeringen: { id: string; naam: string; created_at: string }[];
  investering_transacties: { id: string; investering_id: string; bedrag: number; datum: string; notitie: string | null; created_at: string }[];
  dashboard_maanden: { maand: string; created_at: string }[];
}

export type HuisbalansExportInput = Omit<HuisbalansExport, "versie" | "geexporteerd_op" | "profiel"> & {
  profiel: { gebruikersnaam: string; email: string; lid_sinds: string };
};

/**
 * Pure samensteller — de Server Action haalt de rijen op (met expliciete
 * kolomkeuze, sessie-client, RLS), deze functie zet ze enkel om naar het
 * uiteindelijke bestand. Nep-adressen (isNepEmail) worden hier bewust
 * naar `null` omgezet: zo'n adres is een interne technische placeholder,
 * geen echt e-mailadres van de gebruiker.
 */
export function bouwHuisbalansExport(input: HuisbalansExportInput): HuisbalansExport {
  return {
    versie: 1,
    geexporteerd_op: new Date().toISOString(),
    huishouden: input.huishouden,
    profiel: {
      gebruikersnaam: input.profiel.gebruikersnaam,
      email: isNepEmail(input.profiel.email) ? null : input.profiel.email,
      lid_sinds: input.profiel.lid_sinds,
    },
    gezinsleden: input.gezinsleden,
    inkomen: input.inkomen,
    inkomen_weekbedragen: input.inkomen_weekbedragen,
    extra_inkomen: input.extra_inkomen,
    vaste_kosten: input.vaste_kosten,
    facturen: input.facturen,
    extra_uitgaven: input.extra_uitgaven,
    doelen: input.doelen,
    doel_bijdragen: input.doel_bijdragen,
    investeringen: input.investeringen,
    investering_transacties: input.investering_transacties,
    dashboard_maanden: input.dashboard_maanden,
  };
}

/** bv. huisbalans-gegevens-2026-09-20.json */
export function exportBestandsnaam(datum: Date = new Date()): string {
  const jaar = datum.getFullYear();
  const maand = String(datum.getMonth() + 1).padStart(2, "0");
  const dag = String(datum.getDate()).padStart(2, "0");
  return `huisbalans-gegevens-${jaar}-${maand}-${dag}.json`;
}
