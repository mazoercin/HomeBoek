import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type {
  Inkomen,
  ExtraInkomen,
  InkomenWeekBedrag,
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
  /** Per-week bedragen voor wekelijkse inkomensposten van dit huishouden (niet per maand gefilterd — zie InkomenInput). */
  inkomenWeekBedragen: InkomenWeekBedrag[];
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
  inkomenWeekBedragen: [],
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
 * maand van één huishouden. Inkomen/vaste kosten/facturen/extra
 * uitgaven horen bij exact één maand; doelen en investeringen blijven
 * maand-onafhankelijk (lange-termijntrackers met eigen datumgeschiedenis).
 *
 * Gebruikt bewust de sessie-bewuste (anon-key) client, niet de
 * service-role client: RLS (is_member/can_edit) is hier de échte
 * toegangscontrole, de expliciete household_id-filter eronder is
 * vooral voor efficiëntie en duidelijkheid.
 *
 * Bij een mislukte Supabase-call: DB_001 loggen en `fout: true`
 * teruggeven zodat de UI een vriendelijke foutmelding + "opnieuw
 * proberen" kan tonen in plaats van te crashen.
 */
export async function haalDashboardData(householdId: string, maand: string): Promise<DashboardData> {
  const supabase = maakServerClient();

  try {
    const [
      inkomen,
      extraInkomen,
      inkomenWeekBedragen,
      vasteKosten,
      facturen,
      extraUitgaven,
      doelen,
      doelBijdragen,
      investeringen,
      investeringTransacties,
    ] = await Promise.all([
      supabase.from("inkomen").select("*").eq("household_id", householdId).eq("maand", maand).order("created_at"),
      supabase.from("extra_inkomen").select("*").eq("household_id", householdId).eq("maand", maand),
      // Niet per maand gefilterd (die kolom bestaat hier niet) — de
      // koppeling met een maand loopt via inkomen_id naar de al wél
      // maand-gefilterde `inkomen`-rijen hierboven (zie InkomenInput).
      supabase.from("inkomen_weekbedragen").select("*").eq("household_id", householdId),
      supabase.from("vaste_kosten").select("*").eq("household_id", householdId).eq("maand", maand).order("created_at"),
      supabase.from("facturen").select("*").eq("household_id", householdId).eq("maand", maand).order("created_at"),
      supabase.from("extra_uitgaven").select("*").eq("household_id", householdId).eq("maand", maand).order("created_at"),
      supabase.from("doelen").select("*").eq("household_id", householdId).order("prioriteit"),
      supabase.from("doel_bijdragen").select("*").eq("household_id", householdId).order("datum", { ascending: false }),
      supabase.from("investeringen").select("*").eq("household_id", householdId).order("created_at"),
      supabase
        .from("investering_transacties")
        .select("*")
        .eq("household_id", householdId)
        .order("datum", { ascending: false }),
    ]);

    const alleResultaten = [
      inkomen,
      extraInkomen,
      inkomenWeekBedragen,
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
        context: { householdId, maand, error: eersteFout.error.message },
      });
      return { ...LEEG, fout: true };
    }

    return {
      inkomen: inkomen.data ?? [],
      extraInkomen: extraInkomen.data ?? [],
      inkomenWeekBedragen: inkomenWeekBedragen.data ?? [],
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
      context: { householdId, maand, error: error instanceof Error ? error.message : String(error) },
    });
    return { ...LEEG, fout: true };
  }
}
