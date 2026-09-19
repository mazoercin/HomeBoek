import type {
  Inkomen,
  ExtraInkomen,
  VasteKost,
  Factuur,
  ExtraUitgave,
  Doel,
  DoelBijdrage,
  Investering,
  InvesteringTransactie,
} from "@/types/database";

const SLEUTEL = "saldo_gast_v1";

export interface GastMaandData {
  inkomen: Inkomen[];
  extraInkomen: ExtraInkomen[];
  vasteKosten: VasteKost[];
  facturen: Factuur[];
  extraUitgaven: ExtraUitgave[];
}

export interface GastData {
  maanden: Record<string, GastMaandData>;
  doelen: Doel[];
  doelBijdragen: DoelBijdrage[];
  investeringen: Investering[];
  investeringTransacties: InvesteringTransactie[];
}

export function leegGastMaand(): GastMaandData {
  return { inkomen: [], extraInkomen: [], vasteKosten: [], facturen: [], extraUitgaven: [] };
}

export function leegGastData(): GastData {
  return { maanden: {}, doelen: [], doelBijdragen: [], investeringen: [], investeringTransacties: [] };
}

/** Leest de gast-data uit localStorage. Geeft altijd een geldige (evt. lege) structuur terug, nooit null/undefined. */
export function leesGastData(): GastData {
  if (typeof window === "undefined") return leegGastData();
  try {
    const ruw = window.localStorage.getItem(SLEUTEL);
    if (!ruw) return leegGastData();
    return { ...leegGastData(), ...(JSON.parse(ruw) as Partial<GastData>) };
  } catch {
    return leegGastData();
  }
}

export function schrijfGastData(data: GastData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(data));
  } catch {
    // Privé-browsen of volle opslag: de wijziging blijft dan enkel voor
    // deze paginaweergave gelden, niet blijvend — niet kritiek genoeg om
    // de gebruiker hier mee lastig te vallen; de UI werkt gewoon door.
  }
}

export function wisGastData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SLEUTEL);
  } catch {
    // Zie schrijfGastData hierboven.
  }
}

/** Is er al iets ingevuld in gast-modus? Bepaalt of we bij registratie/login iets te importeren hebben. */
export function heeftGastData(): boolean {
  if (typeof window === "undefined") return false;
  const data = leesGastData();
  return Object.keys(data.maanden).length > 0 || data.doelen.length > 0 || data.investeringen.length > 0;
}

export function nieuwId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `gast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function nu(): string {
  return new Date().toISOString();
}

/** Vaste placeholder-metadata voor de HuishoudenRij-velden — in gast-modus is er (nog) geen echt huishouden. */
export const GAST_METADATA = { household_id: "gast", created_by: null, updated_by: null, version: 1 } as const;

export function maandVan(data: GastData, maand: string): GastMaandData {
  return data.maanden[maand] ?? leegGastMaand();
}

export function metMaand(data: GastData, maand: string, wijzig: (m: GastMaandData) => GastMaandData): GastData {
  return { ...data, maanden: { ...data.maanden, [maand]: wijzig(maandVan(data, maand)) } };
}
