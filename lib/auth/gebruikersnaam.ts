/**
 * Gedeelde validatie voor gebruikersnamen — gebruikt zowel client-side
 * (directe feedback in het formulier) als server-side (nooit enkel op
 * de client vertrouwen). Puur en dependency-vrij, dus zonder gedoe
 * los te testen.
 *
 * Login gebeurt via gebruikersnaam i.p.v. e-mailadres, dus deze moet
 * uniek zijn (hoofdletterongevoelig — zie migratie 0020) en beperkt tot
 * tekens die je probleemloos kan doorgeven/intikken.
 */
export const GEBRUIKERSNAAM_PATROON = /^[a-zA-Z0-9_.-]{3,24}$/;

export function valideerGebruikersnaamFormaat(waarde: string): string | null {
  if (!GEBRUIKERSNAAM_PATROON.test(waarde)) {
    return "Gebruikersnaam moet 3-24 tekens zijn: letters, cijfers, punt, streepje of underscore.";
  }
  return null;
}
