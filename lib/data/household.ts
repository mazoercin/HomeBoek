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
      supabase
        .from("household_members")
        .select("*, profiel:profiles(gebruikersnaam, email, avatar_color)")
        .eq("household_id", householdId)
        .order("joined_at"),
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

    const eersteFout = [ledenRes, uitnodigingenRes, activiteitRes].find((r) => r.error);
    if (eersteFout?.error) {
      logger.error({
        code: "DB_001",
        message: "Kon huishoudoverzicht niet ophalen",
        context: { householdId, error: eersteFout.error.message },
      });
      return { leden: [], openstaandeUitnodigingen: [], recenteActiviteit: [], fout: true };
    }

    return {
      leden: (ledenRes.data ?? []) as unknown as HouseholdLidMetProfiel[],
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
