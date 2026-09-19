import { cookies } from "next/headers";

/**
 * Bewaart een uitnodigingstoken kortstondig server-side (httpOnly
 * cookie) zodat hij de registratie- en e-mailbevestigingsronde
 * overleeft — de URL-fragment (#token) zelf gaat verloren zodra je
 * naar /registreren navigeert. Nooit in een gewone (leesbare) cookie,
 * nooit in een URL na deze stap, dus nooit in server-logs.
 *
 * Enkel server-only code mag dit bestand importeren (niet vanuit een
 * client component) — zie app/uitnodiging/cookie-actions.ts voor de
 * variant die wél vanuit de client aanroepbaar is.
 */
export const UITNODIGING_COOKIE_NAAM = "saldo_uitnodiging_token";
const MAX_AGE_SECONDEN = 30 * 60; // 30 minuten

export function bewaarUitnodigingTokenServer(token: string): void {
  cookies().set(UITNODIGING_COOKIE_NAAM, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDEN,
  });
}

export function haalUitnodigingToken(): string | null {
  return cookies().get(UITNODIGING_COOKIE_NAAM)?.value ?? null;
}

export function wisUitnodigingToken(): void {
  cookies().delete(UITNODIGING_COOKIE_NAAM);
}
