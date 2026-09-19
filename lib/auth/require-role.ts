import { redirect } from "next/navigation";
import { haalSessie, type SessieData } from "@/lib/auth/session";

/** Vereist enkel een geldige login-sessie, geen huishouden. Gebruik voor onboarding/uitnodigingspagina's. */
export function requireSessie(): SessieData {
  const sessie = haalSessie();
  if (!sessie) {
    redirect("/login");
  }
  return sessie;
}
