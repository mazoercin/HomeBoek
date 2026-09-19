import { describe, it, expect } from "vitest";
import { parseBedragNaarCents, centsNaarEuro, euroNaarCents, formatteerEuroCents } from "./geld";

describe("parseBedragNaarCents", () => {
  it("parseert een komma als decimaalteken", () => {
    expect(parseBedragNaarCents("8,5")).toBe(850);
  });

  it("parseert een punt als decimaalteken", () => {
    expect(parseBedragNaarCents("8.50")).toBe(850);
  });

  it("parseert NL/BE-notatie met duizendtal-punt en decimaal-komma", () => {
    expect(parseBedragNaarCents("1.234,56")).toBe(123456);
  });

  it("parseert US-notatie met duizendtal-komma en decimaal-punt", () => {
    expect(parseBedragNaarCents("1,234.56")).toBe(123456);
  });

  it("parseert een geheel getal zonder decimalen", () => {
    expect(parseBedragNaarCents("8")).toBe(800);
  });

  it("geeft null voor lege invoer", () => {
    expect(parseBedragNaarCents("")).toBeNull();
    expect(parseBedragNaarCents("   ")).toBeNull();
  });

  it("geeft null voor 0", () => {
    expect(parseBedragNaarCents("0")).toBeNull();
    expect(parseBedragNaarCents("0,00")).toBeNull();
  });

  it("geeft null voor een negatief bedrag", () => {
    expect(parseBedragNaarCents("-5")).toBeNull();
    expect(parseBedragNaarCents("-5,50")).toBeNull();
  });

  it("geeft null voor niet-numerieke tekst", () => {
    expect(parseBedragNaarCents("tekst")).toBeNull();
    expect(parseBedragNaarCents("abc,de")).toBeNull();
  });

  it("geeft null bij meer dan 2 decimalen", () => {
    expect(parseBedragNaarCents("8,555")).toBeNull();
    expect(parseBedragNaarCents("8.999")).toBeNull();
  });

  it("rondt kleine drijvendekomma-afwijkingen correct af naar cents", () => {
    // Klassieke float-valkuil: 0.1 + 0.2 !== 0.3 in gewone JS-floats.
    expect(parseBedragNaarCents("0,1")).toBe(10);
    expect(parseBedragNaarCents("0,29")).toBe(29);
  });
});

describe("cents <-> euro", () => {
  it("rondt euroNaarCents correct af", () => {
    expect(euroNaarCents(8.5)).toBe(850);
    expect(euroNaarCents(0.1)).toBe(10);
  });

  it("centsNaarEuro is de omgekeerde bewerking", () => {
    expect(centsNaarEuro(850)).toBe(8.5);
    expect(centsNaarEuro(123456)).toBe(1234.56);
  });
});

describe("formatteerEuroCents", () => {
  it("formatteert in NL/BE-notatie met duizendtal-punt en decimaal-komma", () => {
    expect(formatteerEuroCents(123456)).toBe("€ 1.234,56");
  });

  it("formatteert kleine bedragen zonder duizendtal-punt", () => {
    expect(formatteerEuroCents(850)).toBe("€ 8,50");
  });

  it("formatteert negatieve bedragen met een minteken vóór het euroteken", () => {
    expect(formatteerEuroCents(-850)).toBe("-€ 8,50");
  });

  it("formatteert 0 correct", () => {
    expect(formatteerEuroCents(0)).toBe("€ 0,00");
  });
});
