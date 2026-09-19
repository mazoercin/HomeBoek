import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import type { HouseholdLid, HouseholdUitnodiging, ActiviteitLogRegel, Profiel } from "@/types/database";

export interface HouseholdLidMetProfiel extends HouseholdLid {
  profiel: Pick<Profiel, "gebruikersnaam" | "email" | "avatar_color"> | null;
}

export interface HouseholdOverzicht {
  leden: HouseholdLidMetProfiel[];
  openstaandeUitnodigingen: HouseholdUitnodiging[];
  recenteActiviteit: ActiviteitLogRegel[];
  fout: boolean;
}

/** Alle data voor de "Gezin"-pagina: ledenlijst, openstaande uitnodigingen, recente activiteit. */
export async function haalHouseholdOverzicht(householdId: string): Promise<HouseholdOverzicht> {
  const supabase = maakServerClient();

  try {
    const [ledenRes, uitnodigingenRes, activiteitRes] = await Promise.all([
      supabase.from("household_members").select("*").eq("household_id", householdId).order("joined_at"),
      supabase
        .from("household_invites")
        .select("*")
        .eq("household_id", householdId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_log")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Losse query i.p.v. een PostgREST-embed ("profiel:profiles(...)"):
    // household_members.user_id en profiles.user_id refereren allebei
    // onafhankelijk naar auth.users(id), maar zonder een rechtstreekse FK
    // tússen household_members en profiles kan PostgREST die relatie niet
    // herkennen — elke aanroep faalde met "Could not find a relationship
    // between 'household_members' and 'profiles'", en de ledenlijst op
    // /instellingen toonde daardoor altijd 0 leden.
    const gebruikerIds = (ledenRes.data ?? []).map((lid) => lid.user_id as string);
    const profielenRes =
      gebruikerIds.length > 0
        ? await supabase.from("profiles").select("user_id, gebruikersnaam, email, avatar_color").in("user_id", gebruikerIds)
        : { data: [] as Pick<Profiel, "user_id" | "gebruikersnaam" | "email" | "avatar_color">[], error: null };

    const eersteFout = [ledenRes, uitnodigingenRes, activiteitRes, profielenRes].find((r) => r.error);
    if (eersteFout?.error) {
      logger.error({
        code: "DB_001",
        message: "Kon huishoudoverzicht niet ophalen",
        context: { householdId, error: eersteFout.error.message },
      });
      return { leden: [], openstaandeUitnodigingen: [], recenteActiviteit: [], fout: true };
    }

    const profielPerGebruiker = new Map((profielenRes.data ?? []).map((p) => [p.user_id, p]));
    const leden: HouseholdLidMetProfiel[] = (ledenRes.data ?? []).map((lid) => ({
      ...(lid as HouseholdLid),
      profiel: profielPerGebruiker.get(lid.user_id as string) ?? null,
    }));

    return {
      leden,
      openstaandeUitnodigingen: (uitnodigingenRes.data ?? []) as HouseholdUitnodiging[],
      recenteActiviteit: (activiteitRes.data ?? []) as ActiviteitLogRegel[],
      fout: false,
    };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij ophalen huishoudoverzicht",
      context: { householdId, error: error instanceof Error ? error.message : String(error) },
    });
    return { leden: [], openstaandeUitnodigingen: [], recenteActiviteit: [], fout: true };
  }
}
