import { redirect } from "next/navigation";
import { haalSessie, verwijderSessieCookie, type SessieData } from "@/lib/auth/session";
import { maakServerClient } from "@/lib/supabase/server";

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
 */
export async function requireSessie(): Promise<SessieData> {
  const sessie = haalSessie();
  if (!sessie) {
    redirect("/login");
  }

  const supabase = maakServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.id !== sessie.gebruikerId) {
    verwijderSessieCookie();
    redirect("/login");
  }

  return sessie;
}
