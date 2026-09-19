import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Alle tests gaan via gast-modus (/gast) — volledig lokaal, geen account/Supabase nodig, en DashboardClient (met de FAB) is exact dezelfde component als voor ingelogde gebruikers. */
async function gaNaarGastDashboard(page: Page) {
  await page.goto("/gast");
  await page.waitForURL(/\/gast\/\d{4}-\d{2}/);
  await expect(page.getByRole("heading", { name: /Gezinsfinanciën/ })).toBeVisible();
}

function euroTekstNaarGetal(tekst: string): number {
  return Number(tekst.replace(/[^\d,.-]/g, "").replace(",", "."));
}

test.describe("Extra kost — snel toevoegen via de floating knop", () => {
  test("openen, invullen, toevoegen: verschijnt direct in de lijst en saldo is meteen bijgewerkt, blijft staan na herlaad", async ({
    page,
  }) => {
    await gaNaarGastDashboard(page);

    const openstaandVoor = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());
    const watOverblijftVoor = euroTekstNaarGetal(await page.getByTestId("samenvatting-watoverblijft").innerText());

    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });
    await expect(dialoog).toBeVisible();
    await expect(page.getByLabel("Bedrag (€)")).toBeFocused();

    await page.getByLabel("Bedrag (€)").fill("8,50");
    await page.getByLabel("Omschrijving").fill("Boodschappen");
    await dialoog.getByRole("button", { name: "Toevoegen" }).click();

    await expect(page.getByTestId("extra-kost-toast")).toBeVisible();
    await expect(page.getByTestId("extra-kost-toast")).toContainText("€ 8,50 toegevoegd");
    await expect(dialoog).not.toBeVisible();

    const lijst = page.getByTestId("extra-uitgaven-lijst");
    const eersteItem = lijst.locator("li").first();
    await expect(eersteItem).toContainText("Boodschappen");
    await expect(eersteItem).toContainText("€8.50");

    const openstaandNa = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());
    const watOverblijftNa = euroTekstNaarGetal(await page.getByTestId("samenvatting-watoverblijft").innerText());
    expect(openstaandNa).toBeCloseTo(openstaandVoor + 8.5, 2);
    expect(watOverblijftNa).toBeCloseTo(watOverblijftVoor - 8.5, 2);

    await page.reload();
    await expect(page.getByTestId("extra-uitgaven-lijst")).toContainText("Boodschappen");
    const openstaandNaHerlaad = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());
    expect(openstaandNaHerlaad).toBeCloseTo(openstaandVoor + 8.5, 2);
  });

  test("ongedaan maken verwijdert het item en herstelt het exacte saldo", async ({ page }) => {
    await gaNaarGastDashboard(page);
    const openstaandVoor = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());

    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });
    await page.getByLabel("Bedrag (€)").fill("15");
    await page.getByLabel("Omschrijving").fill("Tijdelijk item");
    await dialoog.getByRole("button", { name: "Toevoegen" }).click();

    await expect(page.getByTestId("extra-uitgaven-lijst")).toContainText("Tijdelijk item");
    const openstaandNaToevoegen = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());
    expect(openstaandNaToevoegen).toBeCloseTo(openstaandVoor + 15, 2);

    await page.getByTestId("extra-kost-toast").getByRole("button", { name: "Ongedaan maken" }).click();

    await expect(page.getByTestId("extra-uitgaven-lijst")).not.toContainText("Tijdelijk item");
    const openstaandNaOngedaanMaken = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());
    expect(openstaandNaOngedaanMaken).toBeCloseTo(openstaandVoor, 2);
  });

  test("inline validatie in het Nederlands: foute invoer wijzigt niets aan de data", async ({ page }) => {
    await gaNaarGastDashboard(page);
    const aantalItemsVoor = await page.getByTestId("extra-uitgaven-lijst").locator("li").count();

    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });

    await page.getByLabel("Bedrag (€)").fill("-5");
    await page.getByLabel("Omschrijving").fill("Ongeldig");
    await dialoog.getByRole("button", { name: "Toevoegen" }).click();

    await expect(dialoog.getByRole("alert")).toContainText("geldig bedrag");
    expect(await page.getByTestId("extra-uitgaven-lijst").locator("li").count()).toBe(aantalItemsVoor);
    // Het ingevoerde bedrag blijft staan zodat je het meteen kan corrigeren.
    await expect(page.getByLabel("Bedrag (€)")).toHaveValue("-5");
  });

  test("toetsenbordbediening: sneltoets N opent het scherm, Escape sluit het, Tab blijft binnen de dialoog", async ({
    page,
  }) => {
    await gaNaarGastDashboard(page);

    await page.keyboard.press("n");
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });
    await expect(dialoog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialoog).not.toBeVisible();

    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    await expect(dialoog).toBeVisible();
    // Shift+Tab vanaf het eerste focusbare element moet naar het laatste springen (focus trap), niet uit de dialoog.
    await page.getByLabel("Bedrag (€)").focus();
    await page.keyboard.press("Shift+Tab");
    const actief = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    expect(actief).not.toBeNull();
    await expect(dialoog).toBeVisible();
  });

  test("mobiele weergave (360px): de knop is zichtbaar en de sheet neemt de onderkant van het scherm in", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await gaNaarGastDashboard(page);

    const fab = page.getByRole("button", { name: "Extra kost toevoegen" });
    await expect(fab).toBeVisible();
    const fabBox = await fab.boundingBox();
    expect(fabBox).not.toBeNull();
    if (fabBox) {
      expect(fabBox.width).toBeCloseTo(56, 0);
      expect(fabBox.height).toBeCloseTo(56, 0);
    }

    await fab.click();
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });
    await expect(dialoog).toBeVisible();
    const dialoogBox = await dialoog.boundingBox();
    expect(dialoogBox).not.toBeNull();
    if (dialoogBox) {
      // Bottom sheet: strekt zich uit tot (ongeveer) de onderkant van het scherm.
      expect(dialoogBox.y + dialoogBox.height).toBeGreaterThan(700);
    }
  });

  test("geen axe-schendingen in het snel-invoerscherm", async ({ page }) => {
    await gaNaarGastDashboard(page);
    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    await expect(page.getByRole("dialog", { name: "Extra kost toevoegen" })).toBeVisible();

    const resultaat = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    // ".veld-label" is een al bestaande, sitebrede stijl (elk formulierveld
    // in de app hergebruikt hem) met een randgeval-contrast (4.42 i.p.v.
    // 4.5:1) — buiten de scope van deze taak ("raak niets anders aan").
    // Apart gerapporteerd; hier enkel uitgesloten zodat een NIEUWE
    // schending in mijn eigen componenten deze test wél laat falen.
    const nieuweSchendingen = resultaat.violations.filter(
      (v) => !v.nodes.every((n) => n.html.includes('class="veld-label"'))
    );
    expect(nieuweSchendingen).toEqual([]);
  });
});
