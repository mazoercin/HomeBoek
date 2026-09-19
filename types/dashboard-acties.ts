import type { Categorie, InkomenBron, InkomenFrequentie } from "./database";

export interface KostInvoer {
  label: string;
  bedrag: number;
  categorie: Categorie;
  icoon: string;
  vervaldag: number | null;
  eind_datum: string | null;
}

type Resultaat = Promise<{ gelukt: boolean; foutmelding?: string }>;

/**
 * Eén contract voor alle dashboard-mutaties — of ze nu écht naar Supabase
 * schrijven (ingelogde gebruiker, app/(dashboard)/dashboard/actions.ts) of
 * enkel lokaal in de browser bewaard worden (gast-modus, lib/guest/actions.ts).
 * DashboardClient en MaandKop kennen enkel dit contract, niet welke van de
 * twee erachter zit — dat maakt gast-modus een kwestie van een andere
 * implementatie meegeven, zonder de UI-componenten zelf aan te raken.
 */
export interface DashboardActies {
  zetVasteKostBetaald: (id: string, betaald: boolean) => Resultaat;
  zetFactuurBetaald: (id: string, betaald: boolean) => Resultaat;
  zetExtraUitgaveGeskipt: (id: string, geskipt: boolean) => Resultaat;
  pasWatAlsToe: (extraUitgaveIds: string[]) => Resultaat;
  voegVasteKostToe: (data: KostInvoer, maand: string) => Resultaat;
  verwijderVasteKost: (id: string) => Resultaat;
  voegFactuurToe: (data: KostInvoer, maand: string) => Resultaat;
  verwijderFactuur: (id: string) => Resultaat;
  voegExtraUitgaveToe: (data: { label: string; bedrag: number; overslaanbaar: boolean }, maand: string) => Resultaat;
  verwijderExtraUitgave: (id: string) => Resultaat;
  voegDoelToe: (data: {
    naam: string;
    target_bedrag: number;
    maandelijks_bedrag: number;
    prioriteit: number;
  }) => Resultaat;
  verwijderDoel: (id: string) => Resultaat;
  zetDoelGepauzeerd: (id: string, gepauzeerd: boolean) => Resultaat;
  herschikDoelen: (doelIdsInNieuweVolgorde: string[]) => Resultaat;
  voegDoelBijdrageToe: (data: {
    doel_id: string;
    bedrag: number;
    datum: string;
    notitie: string | null;
    aftrekken_van_inkomen: boolean;
  }) => Resultaat;
  voegInvesteringToe: (naam: string) => Resultaat;
  voegInvesteringTransactieToe: (data: {
    investering_id: string;
    bedrag: number;
    datum: string;
    notitie: string | null;
  }) => Resultaat;
  hernoemInvestering: (id: string, naam: string) => Resultaat;
  verwijderInvestering: (id: string) => Resultaat;
  voegInkomenToe: (
    data: { bron: InkomenBron; label: string; bedrag: number; frequentie: InkomenFrequentie },
    maand: string
  ) => Resultaat;
  verwijderInkomen: (id: string) => Resultaat;
  /** Wist alle data (alle maanden, doelen, investeringen) — enkel bereikbaar voor owner/gast. */
  wisData: () => Resultaat;
}

export type RegistreerMaandActie = (nieuweMaand: string, kopieerVan: string | null) => Resultaat;
