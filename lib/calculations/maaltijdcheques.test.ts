import { describe, expect, it } from "vitest";
import { berekenMaaltijdchequesOntvangen, berekenMaaltijdchequesBesteed, berekenMaaltijdchequesOver } from "./maaltijdcheques";
import type { ExtraUitgave, Inkomen } from "@/types/database";

const METADATA = { household_id: "h1", created_by: null, updated_by: null, version: 1 } as const;

function maakInkomen(overrides: Partial<Inkomen> = {}): Inkomen {
  return {
    id: "i1",
    bron: "maaltijdcheques",
    label: "Maaltijdcheques",
    bedrag: 150,
    frequentie: "maandelijks",
    maand: "2026-09",
    created_at: "",
    updated_at: "",
    ...METADATA,
    ...overrides,
  };
}

function maakExtraUitgave(overrides: Partial<ExtraUitgave> = {}): ExtraUitgave {
  return {
    id: "eu-1",
    label: "Boodschappen",
    bedrag: 20,
    overslaanbaar: false,
    maand: "2026-09",
    geskipt: false,
    betaalmethode: "maaltijdcheque",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...METADATA,
    ...overrides,
  };
}

describe("berekenMaaltijdchequesOntvangen", () => {
  it("telt enkel inkomensposten met bron 'maaltijdcheques'", () => {
    const cheques = maakInkomen({ bedrag: 150 });
    const loon = maakInkomen({ id: "loon", bron: "zelf", label: "Loon", bedrag: 2400 });
    const totaal = berekenMaaltijdchequesOntvangen({ inkomen: [cheques, loon], weekBedragen: [] });
    expect(totaal).toBe(150);
  });

  it("gebruikt weekbedragen wanneer die zijn ingevuld (zelfde omrekenlogica als gewoon inkomen)", () => {
    const cheques = maakInkomen({ id: "cheques", frequentie: "wekelijks", bedrag: 30 });
    const weken = [
      { id: "w1", inkomen_id: "cheques", week_nummer: 1, bedrag: 35, created_at: "", updated_at: "", ...METADATA },
      { id: "w2", inkomen_id: "cheques", week_nummer: 2, bedrag: 35, created_at: "", updated_at: "", ...METADATA },
    ];
    const totaal = berekenMaaltijdchequesOntvangen({ inkomen: [cheques], weekBedragen: weken });
    expect(totaal).toBe(70);
  });

  it("geeft 0 zonder maaltijdcheques-inkomen", () => {
    const loon = maakInkomen({ id: "loon", bron: "zelf", bedrag: 2400 });
    expect(berekenMaaltijdchequesOntvangen({ inkomen: [loon], weekBedragen: [] })).toBe(0);
  });
});

describe("berekenMaaltijdchequesBesteed", () => {
  it("telt enkel niet-geskipte uitgaven met betaalmethode 'maaltijdcheque'", () => {
    const uitgaven = [
      maakExtraUitgave({ id: "a", bedrag: 20, betaalmethode: "maaltijdcheque" }),
      maakExtraUitgave({ id: "b", bedrag: 30, betaalmethode: "bankkaart" }),
      maakExtraUitgave({ id: "c", bedrag: 15, betaalmethode: "maaltijdcheque", geskipt: true }),
    ];
    expect(berekenMaaltijdchequesBesteed(uitgaven)).toBe(20);
  });

  it("geeft 0 bij een lege lijst", () => {
    expect(berekenMaaltijdchequesBesteed([])).toBe(0);
  });
});

describe("berekenMaaltijdchequesOver", () => {
  it("ontvangen min besteed", () => {
    expect(berekenMaaltijdchequesOver(150, 90)).toBe(60);
  });

  it("kan negatief worden (meer besteed dan ontvangen)", () => {
    expect(berekenMaaltijdchequesOver(50, 80)).toBe(-30);
  });
});
