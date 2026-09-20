import { describe, it, expect } from "vitest";
import { magInloggenLogica, type LoginPogingRecord } from "./rate-limit";

const NU = Date.parse("2026-01-01T12:00:00.000Z");
const MINUUT = 60 * 1000;
const SECONDE = 1000;

function poging(overrides: Partial<LoginPogingRecord> = {}): LoginPogingRecord {
  return {
    identificatorHash: "gebruiker-a",
    ipHash: "ip-1",
    gelukt: false,
    aangemaaktOp: NU,
    ...overrides,
  };
}

describe("magInloggenLogica — limiet per identificator (5 per 15 min)", () => {
  it("mag door onder de limiet (4 van de 5 mislukte pogingen)", () => {
    const pogingen = Array.from({ length: 4 }, (_, i) => poging({ aangemaaktOp: NU - i * MINUUT }));
    expect(magInloggenLogica(pogingen, "gebruiker-a", null, NU)).toBe(true);
  });

  it("blokkeert exact op de limiet (5 mislukte pogingen)", () => {
    const pogingen = Array.from({ length: 5 }, (_, i) => poging({ aangemaaktOp: NU - i * MINUUT }));
    expect(magInloggenLogica(pogingen, "gebruiker-a", null, NU)).toBe(false);
  });

  it("telt niet meer mee na het venster van 15 minuten", () => {
    const pogingen = Array.from({ length: 5 }, (_, i) => poging({ aangemaaktOp: NU - 20 * MINUUT - i * MINUUT }));
    expect(magInloggenLogica(pogingen, "gebruiker-a", null, NU)).toBe(true);
  });

  it("reset na een geslaagde login: latere mislukkingen tellen opnieuw vanaf nul", () => {
    const pogingen = [
      ...Array.from({ length: 5 }, (_, i) => poging({ aangemaaktOp: NU - 10 * MINUUT - i * MINUUT })),
      poging({ gelukt: true, aangemaaktOp: NU - 5 * MINUUT }),
      poging({ aangemaaktOp: NU - 1 * MINUUT }),
    ];
    expect(magInloggenLogica(pogingen, "gebruiker-a", null, NU)).toBe(true);
  });

  it("een andere identificator heeft zijn eigen, onafhankelijke teller", () => {
    const pogingen = Array.from({ length: 5 }, (_, i) => poging({ aangemaaktOp: NU - i * MINUUT }));
    expect(magInloggenLogica(pogingen, "gebruiker-b", null, NU)).toBe(true);
  });

  it("gelukte pogingen zelf tellen nooit mee als mislukking", () => {
    const pogingen = Array.from({ length: 6 }, (_, i) => poging({ gelukt: true, aangemaaktOp: NU - i * MINUUT }));
    expect(magInloggenLogica(pogingen, "gebruiker-a", null, NU)).toBe(true);
  });
});

describe("magInloggenLogica — limiet per IP (20 per 15 min)", () => {
  it("mag door onder de IP-limiet (19 van de 20), ook al zijn het allemaal andere identificators", () => {
    const pogingen = Array.from({ length: 19 }, (_, i) =>
      poging({ identificatorHash: `gebruiker-${i}`, ipHash: "ip-gedeeld", aangemaaktOp: NU - i * SECONDE })
    );
    expect(magInloggenLogica(pogingen, null, "ip-gedeeld", NU)).toBe(true);
  });

  it("blokkeert exact op de IP-limiet (20)", () => {
    const pogingen = Array.from({ length: 20 }, (_, i) =>
      poging({ identificatorHash: `gebruiker-${i}`, ipHash: "ip-gedeeld", aangemaaktOp: NU - i * SECONDE })
    );
    expect(magInloggenLogica(pogingen, null, "ip-gedeeld", NU)).toBe(false);
  });

  it("de IP-limiet wordt NIET gereset door een geslaagde login (enkel de identificator-limiet)", () => {
    const pogingen = [
      ...Array.from({ length: 20 }, (_, i) =>
        poging({ identificatorHash: `gebruiker-${i}`, ipHash: "ip-gedeeld", aangemaaktOp: NU - i * SECONDE })
      ),
      poging({ identificatorHash: "gebruiker-0", ipHash: "ip-gedeeld", gelukt: true, aangemaaktOp: NU - 1 * MINUUT }),
    ];
    expect(magInloggenLogica(pogingen, null, "ip-gedeeld", NU)).toBe(false);
  });
});

describe("magInloggenLogica — beide dimensies samen", () => {
  it("blokkeert zodra één van de twee limieten overschreden is (AND-combinatie)", () => {
    const pogingen = Array.from({ length: 5 }, (_, i) => poging({ aangemaaktOp: NU - i * MINUUT }));
    expect(magInloggenLogica(pogingen, "gebruiker-a", "ip-1", NU)).toBe(false);
  });

  it("mag door als beide tellers onder hun eigen limiet blijven", () => {
    const pogingen = Array.from({ length: 3 }, (_, i) => poging({ aangemaaktOp: NU - i * MINUUT }));
    expect(magInloggenLogica(pogingen, "gebruiker-a", "ip-1", NU)).toBe(true);
  });
});
