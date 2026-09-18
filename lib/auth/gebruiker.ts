import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type { Gebruiker } from "@/types/database";

/**
 * Haalt de admin-gebruiker op, of maakt die aan als de tabel nog leeg is.
 * Dit is de "bij het opstarten/eerste login"-stap uit de spec: er is nu
 * één gebruiker, maar het rollen-systeem is zo ontworpen dat er later
 * probleemloos meer gezinsleden (rol 'lid') bij kunnen.
 */
export async function haalOfMaakAdminGebruiker(gebruikersnaam: string): Promise<Gebruiker | null> {
  const supabase = maakServiceClient();

  try {
    const { data: bestaande, error: leesFout } = await supabase
      .from("gebruikers")
      .select("*")
      .eq("gebruikersnaam", gebruikersnaam)
      .maybeSingle();

    if (leesFout) {
      logger.error({
        code: "DB_001",
        message: "Kon gebruiker niet ophalen",
        context: { query: "gebruikers.select", error: leesFout.message },
      });
      return null;
    }

    if (bestaande) return bestaande as Gebruiker;

    const { count, error: telFout } = await supabase
      .from("gebruikers")
      .select("*", { count: "exact", head: true });

    if (telFout) {
      logger.error({
        code: "DB_001",
        message: "Kon gebruikers niet tellen",
        context: { query: "gebruikers.count", error: telFout.message },
      });
      return null;
    }

    // Enkel automatisch aanmaken als de tabel nog volledig leeg is —
    // zo blijft dit veilig herhaalbaar zonder duplicaten te riskeren.
    if (count && count > 0) return null;

    const { data: nieuwe, error: insertFout } = await supabase
      .from("gebruikers")
      .insert({ gebruikersnaam, rol: "admin" })
      .select("*")
      .single();

    if (insertFout) {
      logger.error({
        code: "DB_001",
        message: "Kon admin-gebruiker niet aanmaken",
        context: { query: "gebruikers.insert", error: insertFout.message },
      });
      return null;
    }

    logger.info({
      code: "AUTH_001",
      message: "Eerste admin-gebruiker automatisch aangemaakt",
      context: { gebruikersnaam },
    });

    return nieuwe as Gebruiker;
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij ophalen/aanmaken admin-gebruiker",
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
}
