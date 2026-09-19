import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { berekenTotaalInkomen, berekenOpenstaandBedrag, berekenBijdragenAftrekVoorMaand } from "@/lib/calculations";
import type { Inkomen, ExtraInkomen, VasteKost, Factuur, ExtraUitgave, DoelBijdrage } from "@/types/database";

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
 * Samenvatting (inkomen/uitgaven/saldo) per geregistreerde maand, voor
 * het jaaroverzicht — hergebruikt dezelfde rekenfuncties als het
 * dashboard zelf, gewoon per maand toegepast op alle data in één keer
 * i.p.v. N losse dashboard-fetches per maand.
 */
export async function haalMaandOverzicht(): Promise<{ maanden: MaandSamenvatting[]; fout: boolean }> {
  const supabase = maakServiceClient();

  try {
    const [maandenRes, inkomenRes, extraInkomenRes, vasteKostenRes, facturenRes, extraUitgavenRes, doelBijdragenRes] =
      await Promise.all([
        supabase.from("dashboard_maanden").select("*").order("maand"),
        supabase.from("inkomen").select("*"),
        supabase.from("extra_inkomen").select("*"),
        supabase.from("vaste_kosten").select("*"),
        supabase.from("facturen").select("*"),
        supabase.from("extra_uitgaven").select("*"),
        supabase.from("doel_bijdragen").select("*"),
      ]);

    const alleResultaten = [maandenRes, inkomenRes, extraInkomenRes, vasteKostenRes, facturenRes, extraUitgavenRes, doelBijdragenRes];
    const eersteFout = alleResultaten.find((r) => r.error);
    if (eersteFout?.error) {
      logger.error({
        code: "DB_001",
        message: "Kon maandoverzicht niet ophalen",
        context: { error: eersteFout.error.message },
      });
      return { maanden: [], fout: true };
    }

    const inkomenPerMaand = groepeerPerMaand((inkomenRes.data ?? []) as Inkomen[]);
    const extraInkomenPerMaand = groepeerPerMaand((extraInkomenRes.data ?? []) as ExtraInkomen[]);
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
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return { maanden: [], fout: true };
  }
}
