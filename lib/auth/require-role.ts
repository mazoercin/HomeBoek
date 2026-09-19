import { redirect } from "next/navigation";
import { haalSessie, verwijderSessieCookie, type SessieData } from "@/lib/auth/session";
import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";

/**
 * Vereist een geldige login-sessie, geen huishouden. Gebruik voor
 * onboarding/uitnodigingspagina's.
 *
 * Controleert bewust niet enkel onze eigen (HMAC-ondertekende) cookie,
 * maar ook of die nog overeenkomt met een echt actieve Supabase-sessie
 * op dit request. Onze cookie leeft tot 30 dagen; als Supabase's eigen
 * sessie intussen verlopen/uitgelogd is (of dit een oude cookie van een
 * ander account is), zou anders elke huishouden-lookup op basis van dat
 * user_id stil 0 rijen teruggeven i.p.v. de gebruiker duidelijk opnieuw
 * te laten inloggen.
 *
 * Die live check is zelf een netwerkaanroep — op een wankele (mobiele)
 * verbinding kan die falen zonder dat er iets mis is met de sessie zelf.
 * Zo'n falen mag nooit de hele pagina/actie laten crashen (dat voelde
 * voor de gebruiker aan als "de knop doet niks"): bij een netwerkfout
 * vertrouwen we de bestaande cookie gewoon (fail-open), en wijzen we een
 * sessie enkel expliciet af als Supabase zelf bevestigt dat ze niet meer
 * geldig is of bij een ander account hoort.
 */
export async function requireSessie(): Promise<SessieData> {
  const sessie = haalSessie();
  if (!sessie) {
    redirect("/login");
  }

  // redirect() gooit zelf een speciale (NEXT_REDIRECT-)fout die ongevangen
  // moet doorborrelen naar Next.js — die roepen we dus altijd BUITEN de
  // try/catch aan, nooit erbinnen (anders vangt de catch hieronder haar
  // per ongeluk weg en gebeurt de redirect gewoon niet).
  let sessieOngeldig = false;
  try {
    const supabase = maakServerClient();
    const { data } = await supabase.auth.getUser();
    sessieOngeldig = !data.user || data.user.id !== sessie.gebruikerId;
  } catch (error) {
    logger.warn({
      code: "AUTH_002",
      message: "Kon Supabase-sessie niet live verifiëren — cookie vertrouwd, wellicht een tijdelijke netwerkfout",
      context: { gebruikerId: sessie.gebruikerId, error: error instanceof Error ? error.message : String(error) },
    });
  }

  if (sessieOngeldig) {
    verwijderSessieCookie();
    redirect("/login");
  }

  return sessie;
}
