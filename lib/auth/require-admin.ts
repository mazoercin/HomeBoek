import { redirect } from "next/navigation";
import { requireSessie } from "@/lib/auth/require-role";
import { haalGebruikersProfiel } from "@/lib/auth/gebruiker";
import { isAdminEmail } from "@/lib/auth/admin";
import type { SessieData } from "@/lib/auth/session";

/**
 * Enkel voor /admin: geldige sessie + het vaste admin-e-mailadres.
 * Gebruikt bewust requireSessie() (geen huishouden vereist) — de
 * adminpagina hoeft niet af te hangen van of dit account toevallig ook
 * een huishouden heeft.
 */
export async function requireAdmin(): Promise<SessieData> {
  const sessie = await requireSessie();
  const profiel = await haalGebruikersProfiel(sessie.gebruikerId);
  if (!profiel || !isAdminEmail(profiel.email)) {
    redirect("/geen-toegang");
  }
  return sessie;
}
