import { headers } from "next/headers";
import { logger } from "@/lib/logger.server";

/**
 * Basis-URL voor links die we in e-mails versturen (bevestiging,
 * wachtwoord-herstel, e-mailwijziging) — nooit hardgecodeerd, ook niet
 * localhost.
 *
 * In productie is de env var SITE_URL verplicht: request-headers zoals
 * "host" kunnen door een client meegegeven worden (achter een verkeerd
 * ingestelde proxy soms zelfs vertrouwd), en een vervalste host in een
 * wachtwoord-reset-link is een bekend aanvalspatroon ("host header
 * injection" / reset-link-poisoning). Ontbreekt SITE_URL in productie,
 * dan loggen we dat luid en geven we bewust `null` terug — de aanroeper
 * stuurt dan geen link, i.p.v. er een op een mogelijk onbetrouwbare
 * bron te baseren.
 *
 * Buiten productie (lokaal, preview) is er geen vaste URL vooraf gekend,
 * dus daar leiden we 'm af uit de request zelf — dat is ook precies wat
 * je lokaal wil (http://localhost:3000, of een Vercel-preview-domein).
 */
export function haalSiteUrl(): string | null {
  const envUrl = process.env.SITE_URL?.replace(/\/+$/, "");
  if (envUrl) return envUrl;

  if (process.env.NODE_ENV === "production") {
    logger.error({
      code: "AUTH_003",
      message: "SITE_URL ontbreekt in productie, weiger een link op te bouwen uit request-headers",
    });
    return null;
  }

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
