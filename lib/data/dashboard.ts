import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type {
  Inkomen,
  ExtraInkomen,
  VasteKost,
  VasteKostBetaald,
  Factuur,
  FactuurBetaald,
  ExtraUitgave,
  GeskipteUitgave,
  Doel,
  DoelBijdrage,
  Investering,
  InvesteringTransactie,
} from "@/types/database";

export interface DashboardData {
  inkomen: Inkomen[];
  extraInkomen: ExtraInkomen[];
  vasteKosten: VasteKost[];
  vasteKostenBetaald: VasteKostBetaald[];
  facturen: Factuur[];
  facturenBetaald: FactuurBetaald[];
  extraUitgaven: ExtraUitgave[];
  geskipteUitgaven: GeskipteUitgave[];
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
  vasteKostenBetaald: [],
  facturen: [],
  facturenBetaald: [],
  extraUitgaven: [],
  geskipteUitgaven: [],
  doelen: [],
  doelBijdragen: [],
  investeringen: [],
  investeringTransacties: [],
  fout: false,
};

/**
 * Haalt alle data op die het dashboard nodig heeft voor één maand.
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
      vasteKostenBetaald,
      facturen,
      facturenBetaald,
      extraUitgaven,
      geskipteUitgaven,
      doelen,
      doelBijdragen,
      investeringen,
      investeringTransacties,
    ] = await Promise.all([
      supabase.from("inkomen").select("*").order("created_at"),
      supabase.from("extra_inkomen").select("*").eq("maand", maand),
      supabase.from("vaste_kosten").select("*").order("created_at"),
      supabase.from("vaste_kosten_betaald").select("*").eq("maand", maand),
      supabase.from("facturen").select("*").order("created_at"),
      supabase.from("facturen_betaald").select("*").eq("maand", maand),
      supabase.from("extra_uitgaven").select("*").order("created_at"),
      supabase.from("geskipte_uitgaven").select("*").eq("maand", maand),
      supabase.from("doelen").select("*").order("prioriteit"),
      supabase.from("doel_bijdragen").select("*").order("datum", { ascending: false }),
      supabase.from("investeringen").select("*").order("created_at"),
      supabase.from("investering_transacties").select("*").order("datum", { ascending: false }),
    ]);

    const alleResultaten = [
      inkomen,
      extraInkomen,
      vasteKosten,
      vasteKostenBetaald,
      facturen,
      facturenBetaald,
      extraUitgaven,
      geskipteUitgaven,
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
      vasteKostenBetaald: vasteKostenBetaald.data ?? [],
      facturen: facturen.data ?? [],
      facturenBetaald: facturenBetaald.data ?? [],
      extraUitgaven: extraUitgaven.data ?? [],
      geskipteUitgaven: geskipteUitgaven.data ?? [],
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
