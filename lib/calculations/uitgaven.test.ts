import { describe, it, expect } from "vitest";
import { berekenOpenstaandBedrag, berekenNogTeBetalen } from "./uitgaven";
import { berekenWatOverblijft } from "./saldo";
import type { ExtraUitgave, VasteKost, Factuur } from "@/types/database";

const METADATA = { household_id: "h1", created_by: null, updated_by: null, version: 1 } as const;

function maakExtraUitgave(overrides: Partial<ExtraUitgave> = {}): ExtraUitgave {
  return {
    id: "eu-1",
    label: "Test",
    bedrag: 10,
    overslaanbaar: false,
    maand: "2026-09",
    geskipt: false,
    betaalmethode: "bankkaart",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...METADATA,
    ...overrides,
  };
}

function maakVasteKost(overrides: Partial<VasteKost> = {}): VasteKost {
  return {
    id: "vk-1",
    label: "Huur",
    bedrag: 1000,
    categorie: "huis",
    icoon: "🏠",
    vervaldag: 1,
    eind_datum: null,
    maand: "2026-09",
    betaald: false,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...METADATA,
    ...overrides,
  };
}

function maakFactuur(overrides: Partial<Factuur> = {}): Factuur {
  return {
    id: "f-1",
    label: "Elektriciteit",
    bedrag: 100,
    categorie: "energie",
    icoon: "⚡",
    vervaldag: 15,
    eind_datum: null,
    maand: "2026-09",
    betaald: false,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...METADATA,
    ...overrides,
  };
}

describe("berekenOpenstaandBedrag — extra uitgaven meetellen", () => {
  it("telt een niet-geskipte extra uitgave mee in het maandtotaal", () => {
    const totaal = berekenOpenstaandBedrag({
      vasteKosten: [maakVasteKost()],
      facturen: [maakFactuur()],
      extraUitgaven: [maakExtraUitgave({ bedrag: 8.5 })],
    });
    expect(totaal).toBeCloseTo(1000 + 100 + 8.5, 2);
  });

  it("telt een geskipte (overgeslagen) extra uitgave NIET mee", () => {
    const totaal = berekenOpenstaandBedrag({
      vasteKosten: [],
      facturen: [],
      extraUitgaven: [maakExtraUitgave({ bedrag: 8.5, overslaanbaar: true, geskipt: true })],
    });
    expect(totaal).toBe(0);
  });

  it("telt een met maaltijdcheques betaalde uitgave NIET mee (dat geld kwam nooit van de bankrekening)", () => {
    const totaal = berekenOpenstaandBedrag({
      vasteKosten: [],
      facturen: [],
      extraUitgaven: [maakExtraUitgave({ bedrag: 12, betaalmethode: "maaltijdcheque" })],
    });
    expect(totaal).toBe(0);
  });

  it("mengt bankkaart- en maaltijdcheque-uitgaven correct: enkel bankkaart telt mee", () => {
    const totaal = berekenOpenstaandBedrag({
      vasteKosten: [],
      facturen: [],
      extraUitgaven: [
        maakExtraUitgave({ id: "bankkaart", bedrag: 20, betaalmethode: "bankkaart" }),
        maakExtraUitgave({ id: "cheque", bedrag: 15, betaalmethode: "maaltijdcheque" }),
      ],
    });
    expect(totaal).toBe(20);
  });
});

describe("Saldo vóór en na het toevoegen van een extra kost, en ongedaan maken", () => {
  const inkomen = 2000;

  it("saldo daalt met exact het toegevoegde bedrag", () => {
    const vasteKosten = [maakVasteKost({ bedrag: 1000 })];
    const facturen = [maakFactuur({ bedrag: 100 })];

    const saldoVoor = berekenWatOverblijft(
      inkomen,
      berekenOpenstaandBedrag({ vasteKosten, facturen, extraUitgaven: [] })
    );
    expect(saldoVoor).toBe(2000 - 1100);

    const nieuweUitgave = maakExtraUitgave({ id: "nieuw", bedrag: 8.5 });
    const saldoNa = berekenWatOverblijft(
      inkomen,
      berekenOpenstaandBedrag({ vasteKosten, facturen, extraUitgaven: [nieuweUitgave] })
    );
    expect(saldoNa).toBeCloseTo(saldoVoor - 8.5, 2);
  });

  it("ongedaan maken (item terug verwijderen) herstelt het exacte saldo van vóór het toevoegen", () => {
    const vasteKosten = [maakVasteKost({ bedrag: 1000 })];
    const facturen = [maakFactuur({ bedrag: 100 })];
    const bestaandeUitgaven = [maakExtraUitgave({ id: "bestaand", bedrag: 12.3 })];

    const saldoVoor = berekenWatOverblijft(
      inkomen,
      berekenOpenstaandBedrag({ vasteKosten, facturen, extraUitgaven: bestaandeUitgaven })
    );

    const nieuweUitgave = maakExtraUitgave({ id: "nieuw", bedrag: 8.5 });
    const metNieuwItem = [nieuweUitgave, ...bestaandeUitgaven];
    const saldoNaToevoegen = berekenWatOverblijft(
      inkomen,
      berekenOpenstaandBedrag({ vasteKosten, facturen, extraUitgaven: metNieuwItem })
    );
    expect(saldoNaToevoegen).toBeCloseTo(saldoVoor - 8.5, 2);

    // "Ongedaan maken" = het item er terug uit filteren.
    const naOngedaanMaken = metNieuwItem.filter((u) => u.id !== "nieuw");
    const saldoNaOngedaanMaken = berekenWatOverblijft(
      inkomen,
      berekenOpenstaandBedrag({ vasteKosten, facturen, extraUitgaven: naOngedaanMaken })
    );
    expect(saldoNaOngedaanMaken).toBe(saldoVoor);
  });

  it("saldo kan negatief worden bij een extra kost die het inkomen overschrijdt", () => {
    const saldo = berekenWatOverblijft(
      50,
      berekenOpenstaandBedrag({ vasteKosten: [], facturen: [], extraUitgaven: [maakExtraUitgave({ bedrag: 75 })] })
    );
    expect(saldo).toBe(-25);
    expect(saldo < 0).toBe(true);
  });
});

describe("berekenNogTeBetalen negeert extra uitgaven (geen betaald-status voor extra uitgaven)", () => {
  it("extra uitgaven tellen niet mee in nog-te-betalen, enkel onbetaalde vaste kosten/facturen", () => {
    const nogTeBetalen = berekenNogTeBetalen({
      vasteKosten: [maakVasteKost({ bedrag: 1000, betaald: false })],
      facturen: [maakFactuur({ bedrag: 100, betaald: true })],
    });
    expect(nogTeBetalen).toBe(1000);
  });
});
