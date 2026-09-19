"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { wisLogbestand, logger } from "@/lib/logger.server";
import { zetFamilienaam as zetFamilienaamInData } from "@/lib/data/instellingen";
import { maakServiceClient } from "@/lib/supabase/server";

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

// ---------- Gebruikersbeheer ----------

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://home-boek.vercel.app";
}

/** Verwijdert een account volledig (Supabase Auth + het gekoppelde profiel via cascade). Nooit je eigen account. */
export async function verwijderGebruiker(id: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const sessie = requireRole("admin");

  if (id === sessie.gebruikerId) {
    return { gelukt: false, foutmelding: "Je kan je eigen account hier niet verwijderen." };
  }

  const supabase = maakServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    logger.error({
      code: "AUTH_003",
      message: "Kon gebruiker niet verwijderen",
      context: { gebruikerId: id, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon de gebruiker niet verwijderen." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true };
}

/** Stuurt een wachtwoord-herstel-link naar de gebruiker (gratis via Supabase's ingebouwde mailer). */
export async function stuurWachtwoordResetLink(email: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  requireRole("admin");

  const supabase = maakServiceClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/wachtwoord-herstellen`,
  });

  if (error) {
    logger.error({
      code: "AUTH_003",
      message: "Kon reset-link niet versturen",
      context: { email, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon de reset-link niet versturen." };
  }

  return { gelukt: true };
}

/** Zet meteen zelf een nieuw wachtwoord voor een gebruiker, zonder tussenkomst van die gebruiker. */
export async function veranderWachtwoordVoorGebruiker(
  id: string,
  nieuwWachtwoord: string
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  requireRole("admin");

  if (nieuwWachtwoord.length < 8) {
    return { gelukt: false, foutmelding: "Wachtwoord moet minstens 8 tekens lang zijn." };
  }

  const supabase = maakServiceClient();
  const { error } = await supabase.auth.admin.updateUserById(id, { password: nieuwWachtwoord });

  if (error) {
    logger.error({
      code: "AUTH_003",
      message: "Kon wachtwoord niet wijzigen voor gebruiker",
      context: { gebruikerId: id, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon het wachtwoord niet wijzigen." };
  }

  return { gelukt: true };
}
