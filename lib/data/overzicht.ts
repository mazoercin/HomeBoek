import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { berekenTotaalInkomen, berekenOpenstaandBedrag, berekenBijdragenAftrekVoorMaand } from "@/lib/calculations";
import type { Inkomen, ExtraInkomen, InkomenWeekBedrag, VasteKost, Factuur, ExtraUitgave, DoelBijdrage } from "@/types/database";

export interface MaandSamenvatting {
  maand: string;
  inkomen: number;
  uitgaven: number;
  saldo: number;
}

function groepeerPerMaand<T extends { maand: string }>(items: T[]): Map<string, T[]> {
  const groepen = new Map<string, T[]>();
  for (const item of items) {
    const lijst = groepen.get(item.maand);
    if (lijst) lijst.push(item);
    else groepen.set(item.maand, [item]);
  }
  return groepen;
}

/**
 * Samenvatting (inkomen/uitgaven/saldo) per geregistreerde maand van
 * dit huishouden, voor het jaaroverzicht — hergebruikt dezelfde
 * rekenfuncties als het dashboard zelf, gewoon per maand toegepast op
 * alle data in één keer i.p.v. N losse dashboard-fetches per maand.
 */
export async function haalMaandOverzicht(householdId: string): Promise<{ maanden: MaandSamenvatting[]; fout: boolean }> {
  const supabase = maakServerClient();

  try {
    const [
      maandenRes,
      inkomenRes,
      extraInkomenRes,
      inkomenWeekBedragenRes,
      vasteKostenRes,
      facturenRes,
      extraUitgavenRes,
      doelBijdragenRes,
    ] = await Promise.all([
      supabase.from("dashboard_maanden").select("*").eq("household_id", householdId).order("maand"),
      supabase.from("inkomen").select("*").eq("household_id", householdId),
      supabase.from("extra_inkomen").select("*").eq("household_id", householdId),
      supabase.from("inkomen_weekbedragen").select("*").eq("household_id", householdId),
      supabase.from("vaste_kosten").select("*").eq("household_id", householdId),
      supabase.from("facturen").select("*").eq("household_id", householdId),
      supabase.from("extra_uitgaven").select("*").eq("household_id", householdId),
      supabase.from("doel_bijdragen").select("*").eq("household_id", householdId),
    ]);

    const alleResultaten = [
      maandenRes,
      inkomenRes,
      extraInkomenRes,
      inkomenWeekBedragenRes,
      vasteKostenRes,
      facturenRes,
      extraUitgavenRes,
      doelBijdragenRes,
    ];
    const eersteFout = alleResultaten.find((r) => r.error);
    if (eersteFout?.error) {
      logger.error({
        code: "DB_001",
        message: "Kon maandoverzicht niet ophalen",
        context: { householdId, error: eersteFout.error.message },
      });
      return { maanden: [], fout: true };
    }

    const inkomenPerMaand = groepeerPerMaand((inkomenRes.data ?? []) as Inkomen[]);
    const extraInkomenPerMaand = groepeerPerMaand((extraInkomenRes.data ?? []) as ExtraInkomen[]);
    const weekBedragen = (inkomenWeekBedragenRes.data ?? []) as InkomenWeekBedrag[];
    const vasteKostenPerMaand = groepeerPerMaand((vasteKostenRes.data ?? []) as VasteKost[]);
    const facturenPerMaand = groepeerPerMaand((facturenRes.data ?? []) as Factuur[]);
    const extraUitgavenPerMaand = groepeerPerMaand((extraUitgavenRes.data ?? []) as ExtraUitgave[]);
    const doelBijdragen = (doelBijdragenRes.data ?? []) as DoelBijdrage[];

    const maanden: MaandSamenvatting[] = (maandenRes.data ?? []).map((m) => {
      const maand = m.maand as string;
      const inkomen =
        berekenTotaalInkomen({
          inkomen: inkomenPerMaand.get(maand) ?? [],
          extraInkomen: extraInkomenPerMaand.get(maand) ?? [],
          weekBedragen,
          maand,
        }) - berekenBijdragenAftrekVoorMaand(doelBijdragen, maand);
      const uitgaven = berekenOpenstaandBedrag({
        vasteKosten: vasteKostenPerMaand.get(maand) ?? [],
        facturen: facturenPerMaand.get(maand) ?? [],
        extraUitgaven: extraUitgavenPerMaand.get(maand) ?? [],
      });
      return { maand, inkomen, uitgaven, saldo: inkomen - uitgaven };
    });

    return { maanden, fout: false };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij ophalen maandoverzicht",
      context: { householdId, error: error instanceof Error ? error.message : String(error) },
    });
    return { maanden: [], fout: true };
  }
}
