import { randomBytes } from "crypto";

/**
 * Supabase Auth vereist altijd een e-mailadres. Voor een account zonder
 * (echt) e-mailadres — gezinsleden waarvoor de eigenaar er zelf geen
 * invult, of sinds kort ook de eigenaar zelf bij registratie — gebruiken
 * we een intern, nooit-getoond adres op dit domein. Nooit wijzigen zonder
 * bestaande accounts mee te migreren: hun auth.users.email eindigt hier
 * al echt op.
 */
const NEP_EMAIL_DOMEIN = "leden.homeboek.intern";

export function maakNepEmail(gebruikersnaam: string): string {
  return `${gebruikersnaam.toLowerCase()}.${randomBytes(4).toString("hex")}@${NEP_EMAIL_DOMEIN}`;
}

/** Een adres op dit domein heeft geen echte inbox: nooit een mail naartoe sturen (bevestiging, reset, …). */
export function isNepEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${NEP_EMAIL_DOMEIN}`);
}
