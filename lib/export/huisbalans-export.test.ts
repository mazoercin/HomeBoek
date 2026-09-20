import { describe, it, expect } from "vitest";
import { bouwHuisbalansExport, exportBestandsnaam, type HuisbalansExportInput } from "./huisbalans-export";

function basisInput(overrides: Partial<HuisbalansExportInput> = {}): HuisbalansExportInput {
  return {
    huishouden: { naam: "Ons gezin", valuta: "EUR" },
    profiel: { gebruikersnaam: "hasan", email: "hasan@voorbeeld.be", lid_sinds: "2026-01-01T00:00:00.000Z" },
    gezinsleden: [],
    inkomen: [],
    inkomen_weekbedragen: [],
    extra_inkomen: [],
    vaste_kosten: [],
    facturen: [],
    extra_uitgaven: [],
    doelen: [],
    doel_bijdragen: [],
    investeringen: [],
    investering_transacties: [],
    dashboard_maanden: [],
    ...overrides,
  };
}

describe("bouwHuisbalansExport", () => {
  it("zet versie en geëxporteerd_op, en neemt een echt e-mailadres gewoon over", () => {
    const result = bouwHuisbalansExport(basisInput());
    expect(result.versie).toBe(1);
    expect(typeof result.geexporteerd_op).toBe("string");
    expect(new Date(result.geexporteerd_op).toString()).not.toBe("Invalid Date");
    expect(result.profiel.email).toBe("hasan@voorbeeld.be");
  });

  it("zet een nep-adres (interne placeholder) om naar null", () => {
    const result = bouwHuisbalansExport(
      basisInput({ profiel: { gebruikersnaam: "hasan", email: "hasan.ab12cd34@leden.homeboek.intern", lid_sinds: "2026-01-01T00:00:00.000Z" } })
    );
    expect(result.profiel.email).toBeNull();
  });

  it("gezinsleden bevatten nergens een e-mailadres (enkel gebruikersnaam + rol + lid_sinds)", () => {
    const result = bouwHuisbalansExport(
      basisInput({
        gezinsleden: [{ gebruikersnaam: "guleser", rol: "editor", lid_sinds: "2026-02-01T00:00:00.000Z" }],
      })
    );
    expect(result.gezinsleden).toEqual([{ gebruikersnaam: "guleser", rol: "editor", lid_sinds: "2026-02-01T00:00:00.000Z" }]);
    expect(Object.keys(result.gezinsleden[0]!)).not.toContain("email");
  });

  it("geeft de budgettabellen ongewijzigd door", () => {
    const inkomen = [
      { id: "1", bron: "zelf" as const, label: "Loon", bedrag: 2000, frequentie: "maandelijks" as const, maand: "2026-01", created_at: "x", updated_at: "x" },
    ];
    const result = bouwHuisbalansExport(basisInput({ inkomen }));
    expect(result.inkomen).toEqual(inkomen);
  });
});

describe("exportBestandsnaam", () => {
  it("formatteert als huisbalans-gegevens-JJJJ-MM-DD.json", () => {
    expect(exportBestandsnaam(new Date(2026, 8, 20))).toBe("huisbalans-gegevens-2026-09-20.json");
  });

  it("padt maand en dag met een voorloopnul", () => {
    expect(exportBestandsnaam(new Date(2026, 0, 5))).toBe("huisbalans-gegevens-2026-01-05.json");
  });
});
