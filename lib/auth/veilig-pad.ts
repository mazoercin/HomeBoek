/**
 * Valideert de `next`-parameter van de auth-callback: enkel een relatief
 * pad binnen deze app zelf, nooit een ander domein — anders zou de
 * callback als open-redirect misbruikt kunnen worden. Moet met exact
 * één "/" beginnen (dus niet "//evil.com" of "/\evil.com", allebei
 * browser-trucjes om een host mee te smokkelen), geen schema/host
 * bevatten, en de URL-parser moet dat bevestigen.
 */
export function veiligNextPad(waarde: string | null, standaard: string = "/dashboard"): string {
  if (!waarde) return standaard;
  if (!waarde.startsWith("/") || waarde.startsWith("//") || waarde.startsWith("/\\")) return standaard;
  if (waarde.includes("://")) return standaard;

  try {
    const getest = new URL(waarde, "http://intern.lokaal");
    if (getest.origin !== "http://intern.lokaal") return standaard;
  } catch {
    return standaard;
  }

  return waarde;
}
