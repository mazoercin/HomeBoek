/**
 * Geldbedragen parsen/formatteren voor het snel-toevoegen-formulier van
 * een extra kost. Intern gebeurt alles in gehele cents (nooit floats)
 * om de klassieke drijvendekomma-afrondingsfouten (0.1 + 0.2 !== 0.3) te
 * vermijden bij optellen/valideren; er wordt pas bij weergave (of bij
 * het wegschrijven naar de bestaande `bedrag numeric(12,2)`-kolom, die
 * exacte decimalen bewaart) omgezet naar een euro-getal.
 */

/**
 * Parseert vrije tekstinvoer naar hele cents, of `null` bij ongeldige
 * invoer (leeg, 0, negatief, niet-numeriek, meer dan 2 decimalen).
 * Accepteert zowel komma als punt als decimaalteken, en (bij gebruik
 * van beide) de NL/BE-conventie met een punt als duizendtalscheiding:
 * "8,5" → 850, "8.50" → 850, "1.234,56" → 123456.
 */
export function parseBedragNaarCents(ruw: string): number | null {
  const tekst = ruw.trim();
  if (!tekst) return null;
  if (!/^-?[0-9.,\s]+$/.test(tekst)) return null;

  const laatsteKomma = tekst.lastIndexOf(",");
  const laatstePunt = tekst.lastIndexOf(".");

  let genormaliseerd: string;
  if (laatsteKomma !== -1 && laatstePunt !== -1) {
    // Beide aanwezig: de rechtse is het decimaalteken, de andere is duizendtalscheiding.
    if (laatsteKomma > laatstePunt) {
      genormaliseerd = tekst.replaceAll(".", "").replace(",", ".");
    } else {
      genormaliseerd = tekst.replaceAll(",", "");
    }
  } else if (laatsteKomma !== -1) {
    genormaliseerd = tekst.replace(",", ".");
  } else {
    genormaliseerd = tekst;
  }

  if (!/^-?\d+(\.\d+)?$/.test(genormaliseerd)) return null;

  const decimalenDeel = genormaliseerd.split(".")[1];
  if (decimalenDeel && decimalenDeel.length > 2) return null;

  const waarde = Number(genormaliseerd);
  if (!Number.isFinite(waarde) || waarde <= 0) return null;

  return Math.round(waarde * 100);
}

export function centsNaarEuro(cents: number): number {
  return cents / 100;
}

export function euroNaarCents(euro: number): number {
  return Math.round(euro * 100);
}

/** "€ 1.234,56" — NL/BE-notatie, duizendtal met punt, decimalen met komma. */
export function formatteerEuroCents(cents: number): string {
  const negatief = cents < 0;
  const absoluteCents = Math.round(Math.abs(cents));
  const euroDeel = Math.floor(absoluteCents / 100);
  const centDeel = String(absoluteCents % 100).padStart(2, "0");
  const euroMetPunten = euroDeel.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negatief ? "-" : ""}€ ${euroMetPunten},${centDeel}`;
}

export function formatteerEuro(euro: number): string {
  return formatteerEuroCents(euroNaarCents(euro));
}
