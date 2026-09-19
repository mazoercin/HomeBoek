import { describe, it, expect } from "vitest";
import { vandaagInBrusselAlsDatumString, maandVanDatumString, maandSleutel } from "./maand";

describe("vandaagInBrusselAlsDatumString", () => {
  it("blijft in de vorige maand net vóór middernacht Brusselse tijd (CEST, UTC+2)", () => {
    // 31 augustus 2026 23:59 Brusselse zomertijd = 21:59 UTC.
    const nu = new Date("2026-08-31T21:59:00Z");
    expect(vandaagInBrusselAlsDatumString(nu)).toBe("2026-08-31");
  });

  it("springt naar de nieuwe maand op middernacht Brusselse tijd, óók als UTC nog de vorige dag toont", () => {
    // 1 september 2026 00:01 Brusselse zomertijd = 31 augustus 22:01 UTC —
    // een server die blind op UTC-datum zou afgaan, zou dit fout als augustus tellen.
    const nu = new Date("2026-08-31T22:01:00Z");
    expect(vandaagInBrusselAlsDatumString(nu)).toBe("2026-09-01");
  });

  it("werkt ook rond de jaarwisseling", () => {
    const nu = new Date("2025-12-31T23:30:00Z"); // 2026-01-01 00:30 Brusselse wintertijd (UTC+1)
    expect(vandaagInBrusselAlsDatumString(nu)).toBe("2026-01-01");
  });
});

describe("maandVanDatumString", () => {
  it("haalt de maand uit een datum-string zonder tijdzone-conversie", () => {
    expect(maandVanDatumString("2026-08-31")).toBe("2026-08");
    expect(maandVanDatumString("2026-09-01")).toBe("2026-09");
  });
});

describe("maandSleutel vs. maandVanDatumString blijven consistent van vorm", () => {
  it("geven allebei een YYYY-MM-sleutel terug die string-vergelijkbaar is", () => {
    const viaDatumInput = maandVanDatumString("2026-03-01");
    const viaDate = maandSleutel(new Date(2026, 2, 1)); // maart = index 2, lokale tijd
    expect(viaDatumInput).toBe(viaDate);
  });
});
