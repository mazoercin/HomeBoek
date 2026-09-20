import { describe, expect, it } from "vitest";
import { berekenInkomenMaandbedrag, berekenTotaalInkomen, berekenMaandequivalent } from "./inkomen";
import type { Inkomen, ExtraInkomen, InkomenWeekBedrag } from "@/types/database";

const METADATA = { household_id: "h1", created_by: null, updated_by: null, version: 1 } as const;

function maakInkomen(overrides: Partial<Inkomen> = {}): Inkomen {
  return {
    id: "i1",
    bron: "zelf",
    label: "Loon",
    bedrag: 2400,
    frequentie: "maandelijks",
    maand: "2026-09",
    created_at: "",
    updated_at: "",
    ...METADATA,
    ...overrides,
  };
}

function maakWeekBedrag(overrides: Partial<InkomenWeekBedrag> = {}): InkomenWeekBedrag {
  return {
    id: "w1",
    inkomen_id: "i1",
    week_nummer: 1,
    bedrag: 100,
    created_at: "",
    updated_at: "",
    ...METADATA,
    ...overrides,
  };
}

describe("berekenInkomenMaandbedrag", () => {
  it("gebruikt bedrag × 4 voor wekelijks zonder ingevulde weekbedragen", () => {
    const post = maakInkomen({ frequentie: "wekelijks", bedrag: 90 });
    expect(berekenInkomenMaandbedrag(post, [])).toBe(360);
  });

  it("gebruikt de som van de weekbedragen i.p.v. bedrag × 4 zodra er weekbedragen zijn", () => {
    const post = maakInkomen({ id: "hasan", frequentie: "wekelijks", bedrag: 90 });
    const weken = [
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 1, bedrag: 220 }),
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 2, bedrag: 300 }),
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 3, bedrag: 50 }),
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 4, bedrag: 150 }),
    ];
    // Exact het voorbeeld uit de vraag: 220 + 300 + 50 + 150 = 720, niet 90 × 4 = 360.
    expect(berekenInkomenMaandbedrag(post, weken)).toBe(720);
  });

  it("telt ook een expliciet ingevulde week van €0 mee (niet hetzelfde als 'nog niet ingevuld')", () => {
    const post = maakInkomen({ id: "hasan", frequentie: "wekelijks", bedrag: 90 });
    const weken = [
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 1, bedrag: 220 }),
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 2, bedrag: 0 }),
    ];
    expect(berekenInkomenMaandbedrag(post, weken)).toBe(220);
  });

  it("negeert weekbedragen van een ANDERE inkomenspost", () => {
    const post = maakInkomen({ id: "hasan", frequentie: "wekelijks", bedrag: 90 });
    const weken = [maakWeekBedrag({ inkomen_id: "guleser", week_nummer: 1, bedrag: 999 })];
    // Geen weekbedragen voor "hasan" zelf → terugval op ×4.
    expect(berekenInkomenMaandbedrag(post, weken)).toBe(360);
  });

  it("negeert weekbedragen bij een niet-wekelijkse frequentie (bewust bedrag × 1 ook al zouden er toevallig rijen bestaan)", () => {
    const post = maakInkomen({ id: "i1", frequentie: "maandelijks", bedrag: 2400 });
    const weken = [maakWeekBedrag({ inkomen_id: "i1", week_nummer: 1, bedrag: 100 })];
    expect(berekenInkomenMaandbedrag(post, weken)).toBe(2400);
  });

  it("gooit bij een negatief bedrag", () => {
    const post = maakInkomen({ bedrag: -5 });
    expect(() => berekenInkomenMaandbedrag(post, [])).toThrow();
  });

  it("berekenMaandequivalent (de oude, week-onbewuste variant) blijft ongewijzigd werken voor bestaande aanroepers", () => {
    expect(berekenMaandequivalent(90, "wekelijks")).toBe(360);
    expect(berekenMaandequivalent(2400, "maandelijks")).toBe(2400);
  });
});

describe("berekenTotaalInkomen met weekBedragen", () => {
  it("telt het voorbeeld uit de vraag correct op in het totaal", () => {
    const loon = maakInkomen({ id: "hasan", label: "Hasan loon", frequentie: "wekelijks", bedrag: 90 });
    const kindergeld = maakInkomen({ id: "kg", label: "Kindergeld", frequentie: "maandelijks", bedrag: 185 });
    const weken = [
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 1, bedrag: 220 }),
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 2, bedrag: 300 }),
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 3, bedrag: 50 }),
      maakWeekBedrag({ inkomen_id: "hasan", week_nummer: 4, bedrag: 150 }),
    ];
    const extraInkomen: ExtraInkomen[] = [];

    const totaal = berekenTotaalInkomen({ inkomen: [loon, kindergeld], extraInkomen, weekBedragen: weken, maand: "2026-09" });
    expect(totaal).toBe(720 + 185);
  });

  it("valt terug op de ×4-vuistregel zolang er geen enkel weekbedrag is ingevuld — geen regressie t.o.v. voorheen", () => {
    const loon = maakInkomen({ id: "freelance", frequentie: "wekelijks", bedrag: 90 });
    const totaal = berekenTotaalInkomen({ inkomen: [loon], extraInkomen: [], weekBedragen: [], maand: "2026-09" });
    expect(totaal).toBe(360);
  });
});
