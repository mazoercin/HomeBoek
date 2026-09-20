"use server";

import { redirect } from "next/navigation";
import { maakServerClient } from "@/lib/supabase/server";
import { zetSessieCookie } from "@/lib/auth/session";
import { haalGebruikersProfiel, maakGebruikersProfiel, haalEmailVoorIdentificator } from "@/lib/auth/gebruiker";
import { logger } from "@/lib/logger.server";

export interface LoginState {
  fout: string | null;
}

function vertaalFout(bericht: string): string {
  if (bericht.toLowerCase().includes("email not confirmed")) {
    return "Bevestig eerst je e-mailadres via de link die we je gestuurd hebben.";
  }
  return "Gebruikersnaam of wachtwoord klopt niet.";
}

/**
 * Server Action voor de login-flow. Log in gebeurt op gebruikersnaam
 * (niet e-mailadres) — die wordt hier eerst omgezet naar het bijhorende
 * e-mailadres, want Supabase Auth zelf kent enkel e-mailadres. Verifieert
 * daarna wachtwoord via Supabase Auth (nooit zelf wachtwoorden
 * vergelijken/opslaan), en zet onze eigen lichte sessie-cookie op basis
 * van het gekoppelde gebruikersprofiel.
 */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identificator = String(formData.get("identificator") ?? "").trim();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");

  if (!identificator || !wachtwoord) {
    return { fout: "Vul gebruikersnaam en wachtwoord in." };
  }

  const email = await haalEmailVoorIdentificator(identificator);
  if (!email) {
    logger.warn({ code: "AUTH_001", message: "Login mislukt: onbekende gebruikersnaam", context: { identificator } });
    return { fout: "Gebruikersnaam of wachtwoord klopt niet." };
  }

  const supabase = maakServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });

  if (error || !data.user) {
    logger.warn({
      code: "AUTH_001",
      message: "Login mislukt",
      context: { identificator, error: error?.message ?? "geen gebruiker" },
    });
    return { fout: vertaalFout(error?.message ?? "") };
  }

  let profiel = await haalGebruikersProfiel(data.user.id);

  // Zou niet mogen gebeuren (profiel wordt bij registratie aangemaakt),
  // maar val veilig terug i.p.v. de gebruiker vast te laten lopen.
  if (!profiel) {
    logger.warn({
      code: "AUTH_001",
      message: "Ingelogde gebruiker had nog geen profiel — alsnog aangemaakt",
      context: { gebruikerId: data.user.id },
    });
    profiel = await maakGebruikersProfiel({
      id: data.user.id,
      email,
      gebruikersnaam: (data.user.user_metadata?.gebruikersnaam as string | undefined) ?? email,
    });
  }

  if (!profiel) {
    return { fout: "Er ging iets mis. Probeer het opnieuw." };
  }

  zetSessieCookie({
    gebruikerId: profiel.user_id,
    gebruikersnaam: profiel.gebruikersnaam,
  });

  redirect("/dashboard");
}
