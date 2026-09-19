"use server";

import { maakServerClient } from "@/lib/supabase/server";
import { zetSessieCookie } from "@/lib/auth/session";
import { maakGebruikersProfiel } from "@/lib/auth/gebruiker";
import { logger } from "@/lib/logger.server";

export interface RegistreerState {
  fout: string | null;
  gelukt: boolean;
  /** True zodra we op e-mailbevestiging wachten (geen sessie meteen actief). */
  wachtOpBevestiging: boolean;
}

const BEGIN_STATE: RegistreerState = { fout: null, gelukt: false, wachtOpBevestiging: false };

function vertaalFout(bericht: string): string {
  const lager = bericht.toLowerCase();
  if (lager.includes("already registered") || lager.includes("already exists")) {
    return "Er bestaat al een account met dit e-mailadres.";
  }
  if (lager.includes("password") && lager.includes("least")) {
    return "Wachtwoord moet minstens 8 tekens lang zijn.";
  }
  return "Kon geen account aanmaken. Probeer het opnieuw.";
}

export async function registreer(_prevState: RegistreerState, formData: FormData): Promise<RegistreerState> {
  const gebruikersnaam = String(formData.get("gebruikersnaam") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");
  const wachtwoordBevestiging = String(formData.get("wachtwoord_bevestiging") ?? "");

  if (!gebruikersnaam) {
    return { ...BEGIN_STATE, fout: "Vul een gebruikersnaam in." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ...BEGIN_STATE, fout: "Vul een geldig e-mailadres in." };
  }
  if (wachtwoord.length < 8) {
    return { ...BEGIN_STATE, fout: "Wachtwoord moet minstens 8 tekens lang zijn." };
  }
  if (wachtwoord !== wachtwoordBevestiging) {
    return { ...BEGIN_STATE, fout: "Wachtwoorden komen niet overeen." };
  }

  const supabase = maakServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: wachtwoord,
    options: { data: { gebruikersnaam } },
  });

  if (error || !data.user) {
    logger.warn({
      code: "AUTH_001",
      message: "Registratie mislukt",
      context: { email, error: error?.message ?? "geen gebruiker" },
    });
    return { ...BEGIN_STATE, fout: vertaalFout(error?.message ?? "") };
  }

  const profiel = await maakGebruikersProfiel({ id: data.user.id, email, gebruikersnaam });
  if (!profiel) {
    return { ...BEGIN_STATE, fout: "Account aangemaakt, maar profiel opslaan mislukte. Neem contact op." };
  }

  // Als e-mailbevestiging uitstaat in Supabase, is er meteen een sessie —
  // dan loggen we direct in. Staat bevestiging aan (aanbevolen, standaard),
  // dan is data.session leeg tot de gebruiker de link in zijn mail volgt.
  if (data.session) {
    zetSessieCookie({ gebruikerId: profiel.user_id, gebruikersnaam: profiel.gebruikersnaam });
    return { fout: null, gelukt: true, wachtOpBevestiging: false };
  }

  return { fout: null, gelukt: true, wachtOpBevestiging: true };
}
