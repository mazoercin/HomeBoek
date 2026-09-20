import { describe, it, expect } from "vitest";
import { veiligNextPad } from "./veilig-pad";

describe("veiligNextPad", () => {
  it("laat een gewoon relatief pad door", () => {
    expect(veiligNextPad("/wachtwoord-herstellen")).toBe("/wachtwoord-herstellen");
  });

  it("laat een pad met een querystring door", () => {
    expect(veiligNextPad("/instellingen?email_gewijzigd=1")).toBe("/instellingen?email_gewijzigd=1");
  });

  it("valt terug op de standaard bij null/leeg", () => {
    expect(veiligNextPad(null)).toBe("/dashboard");
    expect(veiligNextPad("")).toBe("/dashboard");
  });

  it("weigert een protocol-relatieve URL (//evil.com)", () => {
    expect(veiligNextPad("//evil.com")).toBe("/dashboard");
  });

  it("weigert een backslash-variant (/\\evil.com)", () => {
    expect(veiligNextPad("/\\evil.com")).toBe("/dashboard");
  });

  it("weigert een volledige URL met eigen host", () => {
    expect(veiligNextPad("https://evil.com")).toBe("/dashboard");
    expect(veiligNextPad("/x://evil.com")).toBe("/dashboard");
  });

  it("weigert een pad zonder leidende slash", () => {
    expect(veiligNextPad("dashboard")).toBe("/dashboard");
  });

  it("gebruikt een eigen standaardwaarde als die meegegeven wordt", () => {
    expect(veiligNextPad(null, "/login")).toBe("/login");
    expect(veiligNextPad("//evil.com", "/login")).toBe("/login");
  });
});
