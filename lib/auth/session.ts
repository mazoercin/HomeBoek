import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Sessiebeheer via een handtekening-gecontroleerde httpOnly cookie.
 *
 * We bewaren geen server-side sessie-store (niet nodig voor dit
 * eenvoudige gezinssysteem): de cookie zelf bevat enkel gebruikers-id +
 * naam, en is voorzien van een HMAC-handtekening (met SESSION_SECRET)
 * zodat de inhoud niet vervalst kan worden vanuit de browser. De cookie
 * is httpOnly zodat client-side JavaScript er nooit bij kan.
 *
 * Rechten (owner/editor/viewer) staan bewust NIET in deze cookie —
 * die zijn altijd per huishouden en worden live opgevraagd uit
 * household_members (zie lib/auth/household.ts), zodat een rolwijziging
 * door de eigenaar meteen ingaat i.p.v. pas na opnieuw inloggen.
 */

const COOKIE_NAAM = "saldo_sessie";
const MAX_AGE_SECONDEN = 60 * 60 * 24 * 30; // 30 dagen

export interface SessieData {
  gebruikerId: string;
  gebruikersnaam: string;
}

function ondertekening(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ontbreekt in de omgevingsvariabelen");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function serialiseer(data: SessieData): string {
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const handtekening = ondertekening(payload);
  return `${payload}.${handtekening}`;
}

function deserialiseer(waarde: string): SessieData | null {
  const [payload, handtekening] = waarde.split(".");
  if (!payload || !handtekening) return null;

  const verwacht = ondertekening(payload);
  const a = Buffer.from(handtekening, "hex");
  const b = Buffer.from(verwacht, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null; // handtekening klopt niet — cookie is vervalst of verouderd
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessieData;
  } catch {
    return null;
  }
}

export function zetSessieCookie(data: SessieData): void {
  cookies().set(COOKIE_NAAM, serialiseer(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDEN,
  });
}

/**
 * Kan zowel vanuit een Server Action/Route Handler (bv. uitloggen()) als
 * vanuit een gewone Server Component render (bv. requireSessie() die een
 * verweesde cookie opruimt) aangeroepen worden. Cookies schrijven mag
 * enkel in de eerste twee contexten — in een Server Component gooit
 * Next.js daar een runtime-fout op. De eigenlijke opruiming is in dat
 * geval niet cruciaal: de daaropvolgende redirect("/login") is het punt,
 * en een volgende schrijfbare context (login/uitloggen) overschrijft de
 * cookie toch.
 */
export function verwijderSessieCookie(): void {
  try {
    cookies().delete(COOKIE_NAAM);
  } catch {
    // Zie opmerking hierboven — verwacht binnen een Server Component render.
  }
}

/** Leest en valideert de sessie-cookie. Geeft `null` als er geen (geldige) sessie is. */
export function haalSessie(): SessieData | null {
  const waarde = cookies().get(COOKIE_NAAM)?.value;
  if (!waarde) return null;
  return deserialiseer(waarde);
}
