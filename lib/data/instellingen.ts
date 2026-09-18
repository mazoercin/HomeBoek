import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";

const SLEUTEL_FAMILIENAAM = "familienaam";

/** Leest de ingestelde familienaam (bv. "Familie Mazmahor"), of `null` als er nog niets is ingesteld. */
export async function haalFamilienaam(): Promise<string | null> {
  const supabase = maakServiceClient();

  try {
    const { data, error } = await supabase
      .from("instellingen")
      .select("waarde")
      .eq("sleutel", SLEUTEL_FAMILIENAAM)
      .maybeSingle();

    if (error) {
      logger.error({
        code: "DB_001",
        message: "Kon familienaam niet ophalen",
        context: { query: "instellingen.select", error: error.message },
      });
      return null;
    }

    return data?.waarde ?? null;
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij ophalen familienaam",
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
}

export async function zetFamilienaam(naam: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const supabase = maakServiceClient();

  try {
    const { error } = await supabase
      .from("instellingen")
      .upsert({ sleutel: SLEUTEL_FAMILIENAAM, waarde: naam }, { onConflict: "sleutel" });

    if (error) {
      logger.error({
        code: "DB_001",
        message: "Kon familienaam niet opslaan",
        context: { query: "instellingen.upsert", error: error.message },
      });
      return { gelukt: false, foutmelding: "Kon de familienaam niet opslaan, probeer opnieuw." };
    }

    return { gelukt: true };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij opslaan familienaam",
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return { gelukt: false, foutmelding: "Kon de familienaam niet opslaan, probeer opnieuw." };
  }
}
