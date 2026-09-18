import { logger } from "@/lib/logger";

/**
 * Gedeelde formuliervalidatie voor de onboarding-wizard en dashboard-
 * formulieren. Geeft altijd een duidelijke Nederlandstalige melding
 * terug (nooit een kale browser-alert) en logt FORM_001 zodat
 * herhaalde invoerproblemen zichtbaar zijn in het logboek.
 */

export function valideerVerplichteTekst(waarde: string, veldnaam: string): string | null {
  if (!waarde.trim()) {
    logger.warn({ code: "FORM_001", message: `Verplicht veld leeg: ${veldnaam}` });
    return `${veldnaam} is verplicht.`;
  }
  return null;
}

export function valideerPositiefBedrag(waarde: number, veldnaam: string): string | null {
  if (!Number.isFinite(waarde) || waarde <= 0) {
    logger.warn({ code: "FORM_001", message: `Ongeldig bedrag voor ${veldnaam}`, context: { waarde } });
    return `${veldnaam} moet een positief getal zijn.`;
  }
  return null;
}
