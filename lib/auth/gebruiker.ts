import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type { Profiel } from "@/types/database";

/**
 * Zoekt het e-mailadres achter een gebruikersnaam op — nodig omdat
 * Supabase Auth zelf altijd op e-mailadres inlogt, terwijl deze app
 * gebruikersnaam als login-identificator toont. Bewust met de service-
 * role: vóór het inloggen is er nog geen sessie, dus de normale
 * RLS-scoped client (die enkel je éigen profiel mag lezen) volstaat hier
 * niet. Bevat een "@" (dus mogelijk al een e-mailadres, voor wie dat
 * gewoontegetrouw intikt), dan gewoon dat teruggeven — geen extra
 * opzoeking nodig.
 */
export async function haalEmailVoorIdentificator(identificator: string): Promise<string | null> {
  if (identificator.includes("@")) return identificator.toLowerCase();

  const supabase = maakServiceClient();
  const { data } = await supabase.from("profiles").select("email").ilike("gebruikersnaam", identificator).maybeSingle();
  return data?.email ?? null;
}

/** Haalt het profiel op bij een Supabase Auth-gebruikers-id. */
export async function haalGebruikersProfiel(userId: string): Promise<Profiel | null> {
  const supabase = maakServiceClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon profiel niet ophalen",
      context: { gebruikerId: userId, error: error.message },
    });
    return null;
  }

  return data as Profiel | null;
}

const AVATAR_KLEUREN = ["#6366F1", "#F59E0B", "#10B981", "#F43F5E", "#0EA5E9", "#8B5CF6", "#EC4899"];

/**
 * Maakt het profiel aan direct na een geslaagde registratie bij
 * Supabase Auth. Dit koppelt enkel de basisgegevens — of iemand een
 * huishouden start of via een uitnodiging toetreedt, gebeurt apart in
 * de onboardingflow (dit profiel draagt zelf geen rol meer).
 */
export async function maakGebruikersProfiel(data: {
  id: string;
  email: string;
  gebruikersnaam: string;
}): Promise<Profiel | null> {
  const supabase = maakServiceClient();
  const avatarKleur = AVATAR_KLEUREN[Math.floor(Math.random() * AVATAR_KLEUREN.length)];

  const { data: nieuw, error: insertFout } = await supabase
    .from("profiles")
    .insert({ user_id: data.id, email: data.email, gebruikersnaam: data.gebruikersnaam, avatar_color: avatarKleur })
    .select("*")
    .single();

  if (insertFout) {
    logger.error({
      code: "DB_001",
      message: "Kon profiel niet aanmaken na registratie",
      context: { gebruikerId: data.id, error: insertFout.message },
    });
    return null;
  }

  return nieuw as Profiel;
}
