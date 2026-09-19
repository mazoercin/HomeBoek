import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type {
  Inkomen,
  ExtraInkomen,
  VasteKost,
  Factuur,
  ExtraUitgave,
  Doel,
  DoelBijdrage,
  Investering,
  InvesteringTransactie,
} from "@/types/database";

export interface DashboardData {
  inkomen: Inkomen[];
  extraInkomen: ExtraInkomen[];
  vasteKosten: VasteKost[];
  facturen: Factuur[];
  extraUitgaven: ExtraUitgave[];
  doelen: Doel[];
  doelBijdragen: DoelBijdrage[];
  investeringen: Investering[];
  investeringTransacties: InvesteringTransactie[];
  fout: boolean;
}

const LEEG: DashboardData = {
  inkomen: [],
  extraInkomen: [],
  vasteKosten: [],
  facturen: [],
  extraUitgaven: [],
  doelen: [],
  doelBijdragen: [],
  investeringen: [],
  investeringTransacties: [],
  fout: false,
};

/**
 * Haalt alle data op die het dashboard nodig heeft voor één specifieke
 * maand. Inkomen/vaste kosten/facturen/extra uitgaven horen nu elk bij
 * exact één maand (net als extra_inkomen al deed) — een andere maand
 * bekijken toont dus echt zijn eigen, onafhankelijke cijfers. Doelen en
 * investeringen blijven maand-onafhankelijk: dat zijn lange-termijn-
 * trackers met hun eigen gedateerde stortingsgeschiedenis.
 *
 * Bij een mislukte Supabase-call: DB_001 loggen en `fout: true`
 * teruggeven zodat de UI een vriendelijke foutmelding + "opnieuw
 * proberen" kan tonen in plaats van te crashen.
 */
export async function haalDashboardData(maand: string): Promise<DashboardData> {
  const supabase = maakServiceClient();

  try {
    const [
      inkomen,
      extraInkomen,
      vasteKosten,
      facturen,
      extraUitgaven,
      doelen,
      doelBijdragen,
      investeringen,
      investeringTransacties,
    ] = await Promise.all([
      supabase.from("inkomen").select("*").eq("maand", maand).order("created_at"),
      supabase.from("extra_inkomen").select("*").eq("maand", maand),
      supabase.from("vaste_kosten").select("*").eq("maand", maand).order("created_at"),
      supabase.from("facturen").select("*").eq("maand", maand).order("created_at"),
      supabase.from("extra_uitgaven").select("*").eq("maand", maand).order("created_at"),
      supabase.from("doelen").select("*").order("prioriteit"),
      supabase.from("doel_bijdragen").select("*").order("datum", { ascending: false }),
      supabase.from("investeringen").select("*").order("created_at"),
      supabase.from("investering_transacties").select("*").order("datum", { ascending: false }),
    ]);

    const alleResultaten = [
      inkomen,
      extraInkomen,
      vasteKosten,
      facturen,
      extraUitgaven,
      doelen,
      doelBijdragen,
      investeringen,
      investeringTransacties,
    ];

    const eersteFout = alleResultaten.find((r) => r.error);
    if (eersteFout?.error) {
      logger.error({
        code: "DB_001",
        message: "Kon dashboard-data niet volledig ophalen",
        context: { maand, error: eersteFout.error.message },
      });
      return { ...LEEG, fout: true };
    }

    return {
      inkomen: inkomen.data ?? [],
      extraInkomen: extraInkomen.data ?? [],
      vasteKosten: vasteKosten.data ?? [],
      facturen: facturen.data ?? [],
      extraUitgaven: extraUitgaven.data ?? [],
      doelen: doelen.data ?? [],
      doelBijdragen: doelBijdragen.data ?? [],
      investeringen: investeringen.data ?? [],
      investeringTransacties: investeringTransacties.data ?? [],
      fout: false,
    };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij ophalen dashboard-data",
      context: { maand, error: error instanceof Error ? error.message : String(error) },
    });
    return { ...LEEG, fout: true };
  }
}
