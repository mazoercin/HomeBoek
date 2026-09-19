/**
 * Hulpfuncties om met "YYYY-MM"-maandsleutels te werken. De hele
 * rekenlogica vergelijkt maanden op dit niveau (nooit op exacte dag),
 * zodat een eind_datum ergens midden in een maand die maand toch nog
 * volledig meetelt.
 */

const MAAND_NAMEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

/** "2026-09" → "September 2026" — voor weergave bovenaan het dashboard. */
export function formatteerMaandNaam(maandSleutelWaarde: string): string {
  const [jaarStr, maandStr] = maandSleutelWaarde.split("-");
  const naam = MAAND_NAMEN[Number(maandStr) - 1] ?? maandSleutelWaarde;
  return `${naam.charAt(0).toUpperCase()}${naam.slice(1)} ${jaarStr}`;
}

export function maandSleutel(datum: Date): string {
  const jaar = datum.getFullYear();
  const maand = String(datum.getMonth() + 1).padStart(2, "0");
  return `${jaar}-${maand}`;
}

export function voegMaandenToe(maandSleutelWaarde: string, aantal: number): string {
  const [jaarStr, maandStr] = maandSleutelWaarde.split("-");
  const datum = new Date(Number(jaarStr), Number(maandStr) - 1 + aantal, 1);
  return maandSleutel(datum);
}

/** true als `sleutel` chronologisch na `grens` valt (string-vergelijking werkt dankzij het YYYY-MM-formaat). */
export function isNaMaand(sleutel: string, grens: string): boolean {
  return sleutel > grens;
}

export function isVoorOfGelijkAanMaand(sleutel: string, grens: string): boolean {
  return sleutel <= grens;
}

/**
 * "Vandaag" als "YYYY-MM-DD", altijd in de Europe/Brussels-tijdzone —
 * ongeacht in welke tijdzone de server effectief draait (serverless
 * functies draaien vaak in UTC). `maandSleutel(new Date())` gebruikt de
 * lokale tijdzone van de omgeving, wat rond middernacht Belgische tijd
 * de verkeerde dag/maand kan teruggeven op een server in UTC.
 */
export function vandaagInBrusselAlsDatumString(nu: Date = new Date()): string {
  // en-CA formatteert consequent als YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(nu);
}

/** "YYYY-MM-DD" → "YYYY-MM". */
export function maandVanDatumString(datumString: string): string {
  return datumString.slice(0, 7);
}

/** De echte huidige kalendermaand, Europe/Brussels-bewust. */
export function huidigeMaandInBrussel(nu: Date = new Date()): string {
  return maandVanDatumString(vandaagInBrusselAlsDatumString(nu));
}
