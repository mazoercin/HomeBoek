import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type { Gebruiker } from "@/types/database";

/** Haalt alle gebruikersprofielen op, nieuwste eerst — voor het admin-gebruikersoverzicht. */
export async function lijstGebruikers(): Promise<Gebruiker[]> {
  const supabase = maakServiceClient();
  const { data, error } = await supabase.from("gebruikers").select("*").order("created_at", { ascending: false });

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon gebruikerslijst niet ophalen",
      context: { error: error.message },
    });
    return [];
  }

  return (data ?? []) as Gebruiker[];
}

/** Haalt het gebruikersprofiel op bij een Supabase Auth-gebruikers-id. */
export async function haalGebruikersProfiel(id: string): Promise<Gebruiker | null> {
  const supabase = maakServiceClient();
  const { data, error } = await supabase.from("gebruikers").select("*").eq("id", id).maybeSingle();

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon gebruikersprofiel niet ophalen",
      context: { gebruikerId: id, error: error.message },
    });
    return null;
  }

  return data as Gebruiker | null;
}

/**
 * Maakt het profiel aan direct na een geslaagde registratie bij Supabase
 * Auth. Het allereerste account in de familie wordt automatisch admin,
 * elk volgend account krijgt de rol 'lid' — zelfde principe als de
 * vroegere eerste-login-wordt-admin-logica, nu gewoon op registratie.
 */
export async function maakGebruikersProfiel(data: {
  id: string;
  email: string;
  gebruikersnaam: string;
}): Promise<Gebruiker | null> {
  const supabase = maakServiceClient();

  const { count, error: telFout } = await supabase
    .from("gebruikers")
    .select("*", { count: "exact", head: true });

  if (telFout) {
    logger.error({
      code: "DB_001",
      message: "Kon bestaande gebruikers niet tellen bij registratie",
      context: { error: telFout.message },
    });
    return null;
  }

  const rol = count && count > 0 ? "lid" : "admin";

  const { data: nieuw, error: insertFout } = await supabase
    .from("gebruikers")
    .insert({ id: data.id, email: data.email, gebruikersnaam: data.gebruikersnaam, rol })
    .select("*")
    .single();

  if (insertFout) {
    logger.error({
      code: "DB_001",
      message: "Kon gebruikersprofiel niet aanmaken na registratie",
      context: { gebruikerId: data.id, error: insertFout.message },
    });
    return null;
  }

  return nieuw as Gebruiker;
}
