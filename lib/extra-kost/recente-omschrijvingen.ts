const SLEUTEL = "saldo_extra_kost_recent";
const MAX_AANTAL = 5;

/** Laatst gebruikte omschrijvingen bij de snel-toevoegen-FAB — puur een UI-gemak (autocomplete-chips), geen financiële data. */
export function leesRecenteOmschrijvingen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const ruw = window.localStorage.getItem(SLEUTEL);
    if (!ruw) return [];
    const lijst = JSON.parse(ruw);
    return Array.isArray(lijst) ? lijst.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function voegRecenteOmschrijvingToe(omschrijving: string): void {
  if (typeof window === "undefined") return;
  const schoon = omschrijving.trim();
  if (!schoon) return;
  try {
    const huidige = leesRecenteOmschrijvingen().filter((x) => x.toLowerCase() !== schoon.toLowerCase());
    const nieuw = [schoon, ...huidige].slice(0, MAX_AANTAL);
    window.localStorage.setItem(SLEUTEL, JSON.stringify(nieuw));
  } catch {
    // Privé-browsen of volle opslag — geen probleem, gewoon geen geheugen deze sessie.
  }
}
