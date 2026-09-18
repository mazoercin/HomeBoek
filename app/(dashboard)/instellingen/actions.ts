"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { wisLogbestand } from "@/lib/logger.server";
import { zetFamilienaam as zetFamilienaamInData } from "@/lib/data/instellingen";

export async function wisLogboek(): Promise<void> {
  requireRole("admin");
  await wisLogbestand();
  revalidatePath("/instellingen");
}

export async function zetFamilienaam(naam: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  requireRole("admin");

  const naamGetrimd = naam.trim();
  if (!naamGetrimd) {
    return { gelukt: false, foutmelding: "Vul een familienaam in." };
  }

  const resultaat = await zetFamilienaamInData(naamGetrimd);
  if (resultaat.gelukt) {
    revalidatePath("/instellingen");
    revalidatePath("/dashboard");
  }
  return resultaat;
}
