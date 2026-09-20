import { describe, it, expect } from "vitest";
import { isAdminEmail } from "./admin";

describe("isAdminEmail", () => {
  it("herkent het admin-adres", () => {
    expect(isAdminEmail("ercin.m@hotmail.com")).toBe(true);
  });

  it("is hoofdletterongevoelig en negeert spaties rond het adres", () => {
    expect(isAdminEmail("Ercin.M@Hotmail.com")).toBe(true);
    expect(isAdminEmail("  ercin.m@hotmail.com  ")).toBe(true);
  });

  it("herkent een ander adres niet als admin", () => {
    expect(isAdminEmail("guleser@voorbeeld.be")).toBe(false);
  });

  it("geeft false bij null/undefined/leeg", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("laat zich niet misleiden door een lookalike-adres", () => {
    expect(isAdminEmail("ercin.m@hotmail.com.evil.com")).toBe(false);
    expect(isAdminEmail("notercin.m@hotmail.com")).toBe(false);
  });
});
