"use server";

import { redirect } from "next/navigation";
import { zetSessieCookie } from "@/lib/auth/session";
import { haalOfMaakAdminGebruiker, heeftBasisdata } from "@/lib/auth/gebruiker";
import { logger } from "@/lib/logger.server";

export interface LoginState {
  fout: string | null;
}

/**
 * Server Action voor de login-flow. Gebruikersnaam/wachtwoord worden
 * UITSLUITEND server-side vergeleken met ADMIN_USERNAME/ADMIN_PASSWORD
 * uit de omgevingsvariabelen — het wachtwoord verlaat de server nooit.
 */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const gebruikersnaam = String(formData.get("gebruikersnaam") ?? "").trim();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");

  const verwachteGebruikersnaam = process.env.ADMIN_USERNAME;
  const verwachtWachtwoord = process.env.ADMIN_PASSWORD;

  if (!verwachteGebruikersnaam || !verwachtWachtwoord) {
    logger.error({
      code: "AUTH_001",
      message: "ADMIN_USERNAME/ADMIN_PASSWORD ontbreken in de omgeving",
    });
    return { fout: "Gebruikersnaam of wachtwoord klopt niet" };
  }

  const klopt =
    gebruikersnaam === verwachteGebruikersnaam && wachtwoord === verwachtWachtwoord;

  if (!klopt) {
    logger.warn({
      code: "AUTH_001",
      message: "Login mislukt",
      context: { ingevoerdeGebruikersnaam: gebruikersnaam },
    });
    return { fout: "Gebruikersnaam of wachtwoord klopt niet" };
  }

  const gebruiker = await haalOfMaakAdminGebruiker(verwachteGebruikersnaam);

  if (!gebruiker) {
    logger.error({
      code: "AUTH_001",
      message: "Login geslaagd maar kon gebruikersrecord niet ophalen/aanmaken",
      context: { gebruikersnaam },
    });
    return { fout: "Er ging iets mis. Probeer het opnieuw." };
  }

  zetSessieCookie({
    gebruikerId: gebruiker.id,
    gebruikersnaam: gebruiker.gebruikersnaam,
    rol: gebruiker.rol,
  });

  const heeftData = await heeftBasisdata();
  redirect(heeftData ? "/dashboard" : "/onboarding");
}
