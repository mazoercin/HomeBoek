import { describe, expect, it } from "vitest";
import { valideerGebruikersnaamFormaat } from "./gebruikersnaam";

describe("valideerGebruikersnaamFormaat", () => {
  it("accepteert een normale gebruikersnaam", () => {
    expect(valideerGebruikersnaamFormaat("Mazmahor")).toBeNull();
  });

  it("accepteert punt, streepje en underscore", () => {
    expect(valideerGebruikersnaamFormaat("test.user-name_2")).toBeNull();
  });

  it("weigert te kort (< 3 tekens)", () => {
    expect(valideerGebruikersnaamFormaat("ab")).not.toBeNull();
  });

  it("weigert te lang (> 24 tekens)", () => {
    expect(valideerGebruikersnaamFormaat("a".repeat(25))).not.toBeNull();
  });

  it("weigert spaties", () => {
    expect(valideerGebruikersnaamFormaat("test user")).not.toBeNull();
  });

  it("weigert een @ (geen e-mailadres als gebruikersnaam)", () => {
    expect(valideerGebruikersnaamFormaat("test@voorbeeld.be")).not.toBeNull();
  });

  it("weigert een lege string", () => {
    expect(valideerGebruikersnaamFormaat("")).not.toBeNull();
  });
});
