"use server";

import { maakServerClient, maakServiceClient } from "@/lib/supabase/server";
import { zetSessieCookie } from "@/lib/auth/session";
import { maakGebruikersProfiel } from "@/lib/auth/gebruiker";
import { valideerGebruikersnaamFormaat } from "@/lib/auth/gebruikersnaam";
import { maakNepEmail } from "@/lib/auth/nep-email";
import { haalIpHash, magDoor, registreerPoging } from "@/lib/auth/rate-limit";
import { haalSiteUrl } from "@/lib/auth/site-url";
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
  const emailInvoer = String(formData.get("email") ?? "").trim().toLowerCase();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");
  const wachtwoordBevestiging = String(formData.get("wachtwoord_bevestiging") ?? "");

  const gebruikersnaamFout = valideerGebruikersnaamFormaat(gebruikersnaam);
  if (gebruikersnaamFout) {
    return { ...BEGIN_STATE, fout: gebruikersnaamFout };
  }
  // E-mailadres is optioneel — enkel het formaat controleren als er iets is ingevuld.
  if (emailInvoer && !/^\S+@\S+\.\S+$/.test(emailInvoer)) {
    return { ...BEGIN_STATE, fout: "Vul een geldig e-mailadres in, of laat het veld leeg." };
  }
  if (wachtwoord.length < 8) {
    return { ...BEGIN_STATE, fout: "Wachtwoord moet minstens 8 tekens lang zijn." };
  }
  if (wachtwoord !== wachtwoordBevestiging) {
    return { ...BEGIN_STATE, fout: "Wachtwoorden komen niet overeen." };
  }

  // Vooraf checken (i.p.v. enkel op de unieke-index in de database te
  // vertrouwen — zie migratie 0020): anders krijg je hier een cryptische
  // "profiel opslaan mislukte" nadat het Supabase Auth-account al wél
  // is aangemaakt. Hoofdletterongevoelig, zoals de unieke index zelf.
  const serviceClient = maakServiceClient();
  const { data: bestaandProfiel } = await serviceClient
    .from("profiles")
    .select("user_id")
    .ilike("gebruikersnaam", gebruikersnaam)
    .maybeSingle();
  if (bestaandProfiel) {
    return { ...BEGIN_STATE, fout: "Deze gebruikersnaam is al in gebruik." };
  }

  if (!emailInvoer) {
    return registreerZonderEmail(gebruikersnaam, wachtwoord, serviceClient);
  }

  const siteUrl = haalSiteUrl();
  if (!siteUrl) {
    return { ...BEGIN_STATE, fout: "Kon geen bevestigingslink opbouwen. Probeer het later opnieuw." };
  }

  const supabase = maakServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: emailInvoer,
    password: wachtwoord,
    options: {
      data: { gebruikersnaam },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
    },
  });

  if (error || !data.user) {
    logger.warn({
      code: "AUTH_001",
      message: "Registratie mislukt",
      context: { email: emailInvoer, error: error?.message ?? "geen gebruiker" },
    });
    return { ...BEGIN_STATE, fout: vertaalFout(error?.message ?? "") };
  }

  // Supabase's signUp() geeft bij een reeds bestaand, al-bevestigd
  // e-mailadres GEEN foutmelding terug (anti-enumeratie-bescherming) —
  // het levert wel "succesvol" een user-object terug, maar dan met een
  // lege identities-array. Zonder deze check leek dat hier op een
  // geslaagde registratie, tot het profiel opslaan strandde op de
  // bestaande rij (verwarrende "profiel opslaan mislukte"-melding).
  if (data.user.identities && data.user.identities.length === 0) {
    return { ...BEGIN_STATE, fout: "Er bestaat al een account met dit e-mailadres." };
  }

  const profiel = await maakGebruikersProfiel({ id: data.user.id, email: emailInvoer, gebruikersnaam });
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

/**
 * Registratie zonder e-mailadres: via de admin-API (zoals gezinsaccounts,
 * app/gezin/actions.ts), zodat er nooit een bevestigingsmail geprobeerd
 * wordt naar het nep-adres — die zou nooit aankomen en de gebruiker voor
 * altijd "wacht op bevestiging" laten hangen. `email_confirm: true`
 * omzeilt dat bewust, enkel voor dit nep-adres.
 */
async function registreerZonderEmail(
  gebruikersnaam: string,
  wachtwoord: string,
  serviceClient: ReturnType<typeof maakServiceClient>
): Promise<RegistreerState> {
  const ipHash = haalIpHash();
  if (!(await magDoor("aanmaken", ipHash, null))) {
    return { ...BEGIN_STATE, fout: "Te veel pogingen, probeer het later opnieuw." };
  }

  const nepEmail = maakNepEmail(gebruikersnaam);
  const { data: nieuweGebruiker, error: createError } = await serviceClient.auth.admin.createUser({
    email: nepEmail,
    password: wachtwoord,
    email_confirm: true,
    user_metadata: { gebruikersnaam },
  });
  await registreerPoging("aanmaken", ipHash, null, !createError);

  if (createError || !nieuweGebruiker.user) {
    logger.warn({
      code: "AUTH_001",
      message: "Registratie zonder e-mailadres mislukt",
      context: { gebruikersnaam, error: createError?.message },
    });
    return { ...BEGIN_STATE, fout: vertaalFout(createError?.message ?? "") };
  }

  const profiel = await maakGebruikersProfiel({ id: nieuweGebruiker.user.id, email: nepEmail, gebruikersnaam });
  if (!profiel) {
    await serviceClient.auth.admin.deleteUser(nieuweGebruiker.user.id);
    return { ...BEGIN_STATE, fout: "Account aangemaakt, maar profiel opslaan mislukte. Neem contact op." };
  }

  // De admin-API geeft zelf geen sessie terug (dat is nooit "jouw eigen"
  // login-context) — meteen zelf inloggen, net als login() dat doet.
  const supabase = maakServerClient();
  const { data: sessieData, error: sessieError } = await supabase.auth.signInWithPassword({
    email: nepEmail,
    password: wachtwoord,
  });

  if (sessieError || !sessieData.session) {
    logger.warn({
      code: "AUTH_001",
      message: "Account zonder e-mailadres aangemaakt, maar automatisch inloggen mislukte",
      context: { gebruikerId: profiel.user_id, error: sessieError?.message },
    });
    return { fout: null, gelukt: true, wachtOpBevestiging: false };
  }

  zetSessieCookie({ gebruikerId: profiel.user_id, gebruikersnaam: profiel.gebruikersnaam });
  return { fout: null, gelukt: true, wachtOpBevestiging: false };
}
