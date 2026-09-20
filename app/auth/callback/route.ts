import { NextResponse, type NextRequest } from "next/server";
import { maakServerClient, maakServiceClient } from "@/lib/supabase/server";
import { zetSessieCookie } from "@/lib/auth/session";
import { haalGebruikersProfiel } from "@/lib/auth/gebruiker";
import { veiligNextPad } from "@/lib/auth/veilig-pad";
import { logger } from "@/lib/logger.server";

/**
 * Eén route voor alle Supabase-e-maillinks (signup-bevestiging,
 * wachtwoord-herstel, e-mailwijziging): wisselt de PKCE-code uit een
 * `emailRedirectTo`/`redirectTo`-link om voor een echte sessie.
 * Zonder deze route landde je op een kale pagina die de `?code=...` in
 * de URL nooit deed iets — dat was de gemelde lege pagina na een
 * bevestigingsmail.
 *
 * We zetten onze eigen sessie-cookie enkel als `next` naar het
 * dashboard wijst (de signup-bevestiging): bij wachtwoord-herstel of
 * een e-mailwijziging is er al wel een Supabase-sessie nodig (voor
 * updateUser), maar mag het enkele klikken van de link op zich niet al
 * volledig inloggen in de app.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = veiligNextPad(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/foutieve-link", request.url));
  }

  const supabase = maakServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    logger.warn({
      code: "AUTH_004",
      message: "Kon auth-code niet omwisselen voor een sessie (verlopen of al gebruikte link)",
      context: { error: error?.message },
    });
    return NextResponse.redirect(new URL("/auth/foutieve-link", request.url));
  }

  // profiles.email gelijktrekken met auth.users.email: cruciaal na een
  // bevestigde e-mailwijziging, anders zoekt haalEmailVoorIdentificator()
  // straks nog het oude adres op en breekt inloggen-op-gebruikersnaam.
  // Onschadelijk (en idempotent) voor signup-/recovery-bevestigingen,
  // waar het adres toch niet wijzigt.
  const serviceClient = maakServiceClient();
  await serviceClient.from("profiles").update({ email: data.user.email }).eq("user_id", data.user.id);

  if (next === "/dashboard") {
    const profiel = await haalGebruikersProfiel(data.user.id);
    if (profiel) {
      zetSessieCookie({ gebruikerId: profiel.user_id, gebruikersnaam: profiel.gebruikersnaam });
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
