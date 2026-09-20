"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { maakServerClient } from "@/lib/supabase/server";
import { zetSessieCookie } from "@/lib/auth/session";
import { haalGebruikersProfiel, maakGebruikersProfiel, haalEmailVoorIdentificator } from "@/lib/auth/gebruiker";
import { haalGezouteHash, haalGezouteIpHash, magDoor, registreerPoging } from "@/lib/auth/rate-limit";
import { logger } from "@/lib/logger.server";

export interface LoginState {
  fout: string | null;
}

const LOGIN_VENSTER_MINUTEN = 15;
/** Ondergrens voor de responstijd, zodat een onbekende gebruikersnaam niet aan een kortere responstijd te herkennen is dan een bestaande gebruikersnaam met een fout wachtwoord. */
const MINIMALE_RESPONSTIJD_MS = 400;

function vertaalFout(bericht: string): string {
  if (bericht.toLowerCase().includes("email not confirmed")) {
    return "Bevestig eerst je e-mailadres via de link die we je gestuurd hebben.";
  }
  return "Gebruikersnaam of wachtwoord klopt niet.";
}

async function wachtTotMinimaleTijd(gestartOp: number): Promise<void> {
  const resterend = MINIMALE_RESPONSTIJD_MS - (Date.now() - gestartOp);
  if (resterend > 0) await new Promise((resolve) => setTimeout(resolve, resterend));
}

/**
 * Server Action voor de login-flow. Log in gebeurt op gebruikersnaam
 * (niet e-mailadres) — die wordt hier eerst omgezet naar het bijhorende
 * e-mailadres, want Supabase Auth zelf kent enkel e-mailadres. Verifieert
 * daarna wachtwoord via Supabase Auth (nooit zelf wachtwoorden
 * vergelijken/opslaan), en zet onze eigen lichte sessie-cookie op basis
 * van het gekoppelde gebruikersprofiel.
 *
 * Roept bewust ALTIJD signInWithPassword aan, ook bij een onbekende
 * gebruikersnaam (dan met een gegarandeerd niet-bestaand dummy-adres),
 * en wacht altijd minstens MINIMALE_RESPONSTIJD_MS voor het antwoord
 * teruggaat — anders verraadt de responstijd zelf of een gebruikersnaam
 * bestaat, ook al is de foutmelding voor beide gevallen al identiek.
 */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const gestartOp = Date.now();
  const identificator = String(formData.get("identificator") ?? "").trim();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");

  if (!identificator || !wachtwoord) {
    return { fout: "Vul gebruikersnaam en wachtwoord in." };
  }

  const identificatorHash = haalGezouteHash(identificator);
  const ipHash = haalGezouteIpHash();

  if (!(await magDoor("login", ipHash, identificatorHash))) {
    await wachtTotMinimaleTijd(gestartOp);
    return { fout: `Te veel pogingen. Probeer het over ${LOGIN_VENSTER_MINUTEN} minuten opnieuw.` };
  }

  const email = await haalEmailVoorIdentificator(identificator);
  const supabase = maakServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email ?? `${randomUUID()}@geen-account.invalid`,
    password: wachtwoord,
  });

  if (error || !data.user || email === null) {
    await registreerPoging("login", ipHash, identificatorHash, false);
    logger.warn({
      code: "AUTH_001",
      message: "Login mislukt",
      context: { identificator, error: error?.message ?? (email === null ? "onbekende gebruikersnaam" : "geen gebruiker") },
    });
    await wachtTotMinimaleTijd(gestartOp);
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
    await wachtTotMinimaleTijd(gestartOp);
    return { fout: "Er ging iets mis. Probeer het opnieuw." };
  }

  await registreerPoging("login", ipHash, identificatorHash, true);

  zetSessieCookie({
    gebruikerId: profiel.user_id,
    gebruikersnaam: profiel.gebruikersnaam,
  });

  await wachtTotMinimaleTijd(gestartOp);
  redirect("/dashboard");
}
