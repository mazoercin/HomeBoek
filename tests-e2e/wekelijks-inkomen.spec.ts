import { test, expect } from "@playwright/test";

test.describe("Wekelijks inkomen met apart bedrag per week", () => {
  test("vult 4 weekbedragen in en het maandtotaal gebruikt de som daarvan, niet de ×4-vuistregel", async ({ page }) => {
    await page.goto("/gast");
    await page.waitForURL(/\/gast\/\d{4}-\d{2}/);
    await expect(page.getByRole("heading", { name: /Gezinsfinanciën/ })).toBeVisible();

    const inkomenKaart = page.locator("#inkomen");
    await inkomenKaart.getByRole("button", { name: "Toevoegen" }).click();
    await inkomenKaart.getByLabel("Label").fill("Hasan loon");
    await inkomenKaart.getByLabel("Bedrag (€)").fill("90");
    await inkomenKaart.getByLabel("Frequentie").selectOption("wekelijks");
    await inkomenKaart.getByRole("button", { name: "Opslaan" }).click();

    const rij = inkomenKaart.getByText("Hasan loon").locator("xpath=ancestor::li");
    // Vóór er weekbedragen ingevuld zijn: gewoon de ×4-vuistregel (€90 × 4 = €360).
    await expect(rij.getByText("€360.00")).toBeVisible();

    await rij.getByRole("button", { name: "Per week invullen" }).click();
    await rij.getByLabel("Week 1").fill("220");
    await rij.getByLabel("Week 2").fill("300");
    await rij.getByLabel("Week 3").fill("50");
    await rij.getByLabel("Week 4").fill("150");
    await rij.getByRole("button", { name: "Opslaan" }).click();

    // Som van de weekbedragen (720), niet meer de ×4-schatting (360).
    // De maandbedrag-span, niet de "Weekbedragen: €720.00 (4/4 weken)"-knop die dezelfde tekst ook bevat.
    await expect(rij.locator("span.font-extrabold")).toHaveText("€720.00");
    await expect(rij.getByText(/Weekbedragen: €720\.00 \(4\/4 weken\)/)).toBeVisible();

    // Blijft bewaard na herlaad (gast-modus = localStorage).
    await page.reload();
    await expect(page.getByRole("heading", { name: /Gezinsfinanciën/ })).toBeVisible();
    const rijNaHerlaad = page.locator("#inkomen").getByText("Hasan loon").locator("xpath=ancestor::li");
    await expect(rijNaHerlaad.locator("span.font-extrabold")).toHaveText("€720.00");
  });

  test("alle 4 weken leegmaken en opslaan valt terug op de ×4-vuistregel", async ({ page }) => {
    await page.goto("/gast");
    await page.waitForURL(/\/gast\/\d{4}-\d{2}/);

    const inkomenKaart = page.locator("#inkomen");
    await inkomenKaart.getByRole("button", { name: "Toevoegen" }).click();
    await inkomenKaart.getByLabel("Label").fill("Freelance");
    await inkomenKaart.getByLabel("Bedrag (€)").fill("90");
    await inkomenKaart.getByLabel("Frequentie").selectOption("wekelijks");
    await inkomenKaart.getByRole("button", { name: "Opslaan" }).click();

    const rij = inkomenKaart.getByText("Freelance").locator("xpath=ancestor::li");
    await rij.getByRole("button", { name: "Per week invullen" }).click();
    await rij.getByLabel("Week 1").fill("500");
    await rij.getByRole("button", { name: "Opslaan" }).click();
    await expect(rij.locator("span.font-extrabold")).toHaveText("€500.00");

    await rij.getByRole("button", { name: /Weekbedragen/ }).click();
    await rij.getByLabel("Week 1").fill("");
    await rij.getByRole("button", { name: "Opslaan" }).click();

    await expect(rij.locator("span.font-extrabold")).toHaveText("€360.00");
  });
});
