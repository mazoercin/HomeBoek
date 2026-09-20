import { describe, it, expect } from "vitest";
import { maakNepEmail, isNepEmail } from "./nep-email";

describe("nep-email", () => {
  it("maakNepEmail() genereert een adres op het interne nep-domein", () => {
    const email = maakNepEmail("Hasan");
    expect(email).toMatch(/^hasan\.[0-9a-f]{8}@leden\.homeboek\.intern$/);
  });

  it("maakNepEmail() genereert bij elke aanroep een ander adres (geen botsingen tussen gezinsleden)", () => {
    const a = maakNepEmail("test");
    const b = maakNepEmail("test");
    expect(a).not.toBe(b);
  });

  it("isNepEmail() herkent een nep-adres", () => {
    expect(isNepEmail("hasan.ab12cd34@leden.homeboek.intern")).toBe(true);
  });

  it("isNepEmail() is hoofdletterongevoelig", () => {
    expect(isNepEmail("Hasan.AB12CD34@Leden.HomeBoek.Intern")).toBe(true);
  });

  it("isNepEmail() herkent een echt adres niet als nep", () => {
    expect(isNepEmail("hasan@voorbeeld.be")).toBe(false);
  });

  it("isNepEmail() laat zich niet misleiden door een lookalike-domein", () => {
    expect(isNepEmail("hasan@leden.homeboek.intern.evil.com")).toBe(false);
    expect(isNepEmail("hasan@nietleden.homeboek.intern")).toBe(false);
  });
});
