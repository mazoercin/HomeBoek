"use server";

import { maakServerClient } from "@/lib/supabase/server";
import { haalEmailVoorIdentificator } from "@/lib/auth/gebruiker";
import { haalGezouteHash, haalGezouteIpHash, magDoor, registreerPoging } from "@/lib/auth/rate-limit";
import { wachtTotMinimaleTijd } from "@/lib/auth/timing";
import { isNepEmail } from "@/lib/auth/nep-email";
import { haalSiteUrl } from "@/lib/auth/site-url";
import { logger } from "@/lib/logger.server";

export interface WachtwoordVergetenState {
  fout: string | null;
  verzonden: boolean;
}

/**
 * Bewust altijd minstens 2 seconden, ongeacht welk pad hieronder gevolgd
 * wordt (onbekende identificator, nep-adres, of een écht verzonden
 * mail) — de 400ms van login() volstaat hier niet: een échte mail
 * versturen via Supabase Auth kan zelf al meer tijd kosten dan dat, en
 * een kortere ondergrens zou dan alsnog verraden of er effectief een
 * mail verstuurd werd. Niet live gemeten (deze omgeving heeft geen
 * netwerktoegang tot een productie-Supabase-project) — bewust ruim
 * gekozen i.p.v. een exact gemeten minimum.
 */
const RESET_MINIMALE_RESPONSTIJD_MS = 2000;

/**
 * Server Action voor "Wachtwoord vergeten": toont ALTIJD dezelfde
 * neutrale melding, of het account nu bestaat, een echt e-mailadres
 * heeft, rate-limited is, of niet — enkel intern verschilt of we
 * effectief een mail versturen.
 */
export async function vraagWachtwoordResetAan(
  _prevState: WachtwoordVergetenState,
  formData: FormData
): Promise<WachtwoordVergetenState> {
  const gestartOp = Date.now();
  const identificator = String(formData.get("identificator") ?? "").trim();

  if (!identificator) {
    return { fout: "Vul je gebruikersnaam of e-mailadres in.", verzonden: false };
  }

  const identificatorHash = haalGezouteHash(identificator);
  const ipHash = haalGezouteIpHash();

  if (!(await magDoor("reset", ipHash, identificatorHash))) {
    await wachtTotMinimaleTijd(gestartOp, RESET_MINIMALE_RESPONSTIJD_MS);
    return { fout: null, verzonden: true };
  }

  const email = await haalEmailVoorIdentificator(identificator);

  if (email && !isNepEmail(email)) {
    const siteUrl = haalSiteUrl();
    if (siteUrl) {
      const supabase = maakServerClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/wachtwoord-herstellen")}`,
      });
      if (error) {
        logger.warn({
          code: "AUTH_001",
          message: "Wachtwoord-reset-mail versturen mislukt",
          context: { error: error.message },
        });
      }
    } else {
      logger.error({ code: "AUTH_003", message: "Geen SITE_URL beschikbaar — kon geen reset-link opbouwen" });
    }
  }

  await registreerPoging("reset", ipHash, identificatorHash, false);
  await wachtTotMinimaleTijd(gestartOp, RESET_MINIMALE_RESPONSTIJD_MS);
  return { fout: null, verzonden: true };
}
