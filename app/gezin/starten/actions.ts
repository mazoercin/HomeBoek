"use server";

import { redirect } from "next/navigation";
import { maakServerClient } from "@/lib/supabase/server";
import { requireSessie } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger.server";

/** Maakt een nieuw huishouden aan met de huidige gebruiker als owner (atomische RPC), en stuurt door naar het dashboard. */
export async function startNieuwHousehold(naam: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const sessie = await requireSessie();
  const supabase = maakServerClient();

  const naamGetrimd = naam.trim() || "Ons gezin";

  const { error } = await supabase.rpc("create_household", { p_name: naamGetrimd });

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon huishouden niet aanmaken",
      context: { gebruikerId: sessie.gebruikerId, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon geen huishouden aanmaken, probeer opnieuw." };
  }

  redirect("/dashboard");
}
