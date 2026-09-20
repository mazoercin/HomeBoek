/** Standaard ondergrens voor de responstijd van een auth-actie die niet mag verraden of een account bestaat. */
const STANDAARD_MINIMALE_RESPONSTIJD_MS = 400;

/**
 * Wacht tot minstens `minimumMs` verstreken is sinds `gestartOp`, zodat
 * een snel kortsluit-pad (bv. "onbekende gebruikersnaam") niet aan een
 * kortere responstijd te herkennen is dan het trage pad (een echte
 * wachtwoord-vergelijking bij Supabase Auth, of — bij wachtwoord-
 * vergeten — een echt verzonden mail). Gedeeld door login en
 * wachtwoord-vergeten zodat beide exact dezelfde aanpak gebruiken.
 */
export async function wachtTotMinimaleTijd(gestartOp: number, minimumMs: number = STANDAARD_MINIMALE_RESPONSTIJD_MS): Promise<void> {
  const resterend = minimumMs - (Date.now() - gestartOp);
  if (resterend > 0) await new Promise((resolve) => setTimeout(resolve, resterend));
}
