"use server";

import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type { Categorie, FlexibelInterval, InkomenBron } from "@/types/database";

export interface OnboardingVastInkomen {
  bron: InkomenBron;
  label: string;
  bedrag: number;
}

export interface OnboardingFlexibelInkomen {
  bron: InkomenBron;
  label: string;
  bedrag: number;
  interval: FlexibelInterval;
  volgende_datum: string;
}

export interface OnboardingKost {
  label: string;
  bedrag: number;
  categorie: Categorie;
  icoon: string;
  vervaldag: number | null;
  eind_datum: string | null;
}

export interface OnboardingExtraUitgave {
  label: string;
  bedrag: number;
  overslaanbaar: boolean;
}

export interface OnboardingDoel {
  naam: string;
  target_bedrag: number;
  maandelijks_bedrag: number;
  prioriteit: number;
}

export interface OnboardingData {
  vast_inkomen: OnboardingVastInkomen[];
  flexibel_inkomen: OnboardingFlexibelInkomen[];
  vaste_kosten: OnboardingKost[];
  facturen: OnboardingKost[];
  extra_uitgaven: OnboardingExtraUitgave[];
  doelen: OnboardingDoel[];
}

export interface OnboardingResultaat {
  gelukt: boolean;
  foutmelding?: string;
}

/**
 * Schrijft alle onboarding-data in één databasetransactie weg via de
 * `onboarding_opslaan`-RPC. Bij een fout: niets wordt gedeeltelijk
 * bewaard (Postgres rolt de hele functie terug), DB_001 wordt gelogd,
 * en de UI krijgt een duidelijke melding + "opnieuw proberen".
 */
export async function slaOnboardingOp(data: OnboardingData): Promise<OnboardingResultaat> {
  const supabase = maakServiceClient();

  try {
    const { error } = await supabase.rpc("onboarding_opslaan", { payload: data });

    if (error) {
      logger.error({
        code: "DB_001",
        message: "Onboarding-data kon niet worden opgeslagen",
        context: { query: "onboarding_opslaan", error: error.message },
      });
      return {
        gelukt: false,
        foutmelding: "Kon je gegevens niet opslaan. Probeer het opnieuw.",
      };
    }

    return { gelukt: true };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij opslaan onboarding-data",
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return {
      gelukt: false,
      foutmelding: "Er ging iets mis bij het opslaan. Controleer je verbinding en probeer opnieuw.",
    };
  }
}
