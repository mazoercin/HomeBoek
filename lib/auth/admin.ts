/**
 * Eén hardcoded admin-account — geen aparte rol/tabel-kolom nodig voor
 * wat vandaag één vaste beheerder is. `isAdminEmail` vergelijkt altijd
 * hoofdletterongevoelig, want dat doet de rest van de app (login,
 * profielen) ook overal.
 */
const ADMIN_EMAIL = "ercin.m@hotmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}
