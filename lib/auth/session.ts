import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { Rol } from "@/types/database";

/**
 * Sessiebeheer via een handtekening-gecontroleerde httpOnly cookie.
 *
 * We bewaren geen server-side sessie-store (niet nodig voor dit
 * eenvoudige gezinssysteem): de cookie zelf bevat gebruikers-id + rol,
 * en is voorzien van een HMAC-handtekening (met SESSION_SECRET) zodat
 * de inhoud niet vervalst kan worden vanuit de browser. De cookie is
 * httpOnly zodat client-side JavaScript er nooit bij kan.
 */

const COOKIE_NAAM = "saldo_sessie";
const MAX_AGE_SECONDEN = 60 * 60 * 24 * 30; // 30 dagen

export interface SessieData {
  gebruikerId: string;
  gebruikersnaam: string;
  rol: Rol;
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

export function verwijderSessieCookie(): void {
  cookies().delete(COOKIE_NAAM);
}

/** Leest en valideert de sessie-cookie. Geeft `null` als er geen (geldige) sessie is. */
export function haalSessie(): SessieData | null {
  const waarde = cookies().get(COOKIE_NAAM)?.value;
  if (!waarde) return null;
  return deserialiseer(waarde);
}
