import { logger } from "@/lib/logger";
import { berekenTotaalInkomen } from "./inkomen";
import { berekenOpenstaandBedrag } from "./uitgaven";
import { voegMaandenToe } from "./maand";
import type {
  VastInkomen,
  FlexibelInkomen,
  ExtraInkomen,
  VasteKost,
  Factuur,
  ExtraUitgave,
} from "@/types/database";

export interface MaandProjectie {
  maand: string; // YYYY-MM
  inkomen: number;
  uitgaven: number;
  saldo: number;
}

export interface PeriodeProjectieInput {
  vastInkomen: VastInkomen[];
  flexibelInkomen: FlexibelInkomen[];
  /** Enkel het extra inkomen van de huidige maand — telt bewust NIET automatisch door naar toekomstige maanden. */
  extraInkomenHuidigeMaand: ExtraInkomen[];
  vasteKosten: VasteKost[];
  facturen: Factuur[];
  extraUitgaven: ExtraUitgave[];
  startMaand: string; // YYYY-MM, huidige maand
  aantalMaanden: 1 | 3 | 6 | 12;
}

/**
 * Periode-projectie: voor 1/3/6/12 maanden vooruit, saldo per maand
 * o.b.v. de HUIDIGE vaste/flexibele inkomsten en uitgaven, met
 * eind_datum correct verrekend (kost stopt mee te tellen na die maand-
 * markering). Eenmalige/variabele posten van de huidige maand (extra
 * inkomen) tellen NIET automatisch mee in toekomstige maanden — dat
 * zou een verkeerd beeld geven. Extra uitgaven zijn per definitie
 * terugkerend en tellen dus wel in elke toekomstige maand mee (er is
 * daar nog geen skip-beslissing voor genomen).
 */
export function berekenPeriodeProjectie(input: PeriodeProjectieInput): MaandProjectie[] {
  const resultaat: MaandProjectie[] = [];

  for (let i = 0; i < input.aantalMaanden; i++) {
    const maand = voegMaandenToe(input.startMaand, i);

    try {
      const inkomen = berekenTotaalInkomen({
        vastInkomen: input.vastInkomen,
        flexibelInkomen: input.flexibelInkomen,
        // extra inkomen telt enkel mee in de maand waarvoor het bedoeld is
        extraInkomen: i === 0 ? input.extraInkomenHuidigeMaand : [],
        maand,
      });

      const uitgaven = berekenOpenstaandBedrag({
        vasteKosten: input.vasteKosten,
        facturen: input.facturen,
        extraUitgaven: input.extraUitgaven,
        geskipteUitgaveIds: [], // toekomstige maanden: nog geen skip-keuze gemaakt
        maand,
      });

      resultaat.push({ maand, inkomen, uitgaven, saldo: inkomen - uitgaven });
    } catch (error) {
      logger.error({
        code: "CALC_001",
        message: "Kon maand-projectie niet berekenen, maand overgeslagen",
        context: { maand, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return resultaat;
}
