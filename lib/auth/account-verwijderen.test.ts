import { describe, it, expect } from "vitest";
import { bepaalVerwijderScope } from "./account-verwijderen";

describe("bepaalVerwijderScope", () => {
  it("de enige eigenaar verwijdert het hele huishouden", () => {
    expect(bepaalVerwijderScope("owner", 1)).toBe("huishouden");
  });

  it("een owner-rij met aantalEigenaren 0 (verweesde/inconsistente data) blijft veilig: nog steeds huishouden", () => {
    expect(bepaalVerwijderScope("owner", 0)).toBe("huishouden");
  });

  it("een eigenaar met een mede-eigenaar verwijdert enkel het eigen account", () => {
    expect(bepaalVerwijderScope("owner", 2)).toBe("zelf");
  });

  it("een editor verwijdert altijd enkel het eigen account", () => {
    expect(bepaalVerwijderScope("editor", 1)).toBe("zelf");
  });

  it("een viewer verwijdert altijd enkel het eigen account", () => {
    expect(bepaalVerwijderScope("viewer", 1)).toBe("zelf");
  });
});
