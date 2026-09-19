import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Ververst de Supabase-authenticatiesessie op elke request en slaat de
 * vernieuwde cookies effectief op in de browser. Zonder dit kan een
 * Server Component wel een verlopen sessie ín het geheugen vernieuwen
 * (via de refresh-token), maar niet de nieuwe cookies wegschrijven
 * (`maakServerClient()`'s cookie-callbacks falen daar bewust stil) —
 * daardoor kon een sessie na een tijdje "vastlopen": een refresh-token
 * die al gebruikt was zonder dat de nieuwe versie ooit bij de browser
 * terechtkwam, en dus de volgende keer niet meer geldig was. Dit trof
 * vooral wie de app als icoontje op het beginscherm gebruikt en gewoon
 * rondkijkt zonder een formulier te versturen (geen Server Action die
 * wél mag schrijven) — leek dan op willekeurig uitloggen.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Enkel dit aanroepen is genoeg: bij een verlopen access token probeert
  // de client automatisch te verversen via de refresh-token, en de
  // cookie-callbacks hierboven persisteren dat resultaat meteen in de
  // response — vóór eender welke pagina of Server Action draait.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Overal behalve statische assets: die hebben geen sessie nodig en
     * hoeven niet bij elke laad opnieuw langs Supabase te gaan.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
