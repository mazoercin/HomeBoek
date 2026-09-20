import { test, expect, type Page } from "@playwright/test";

/** Alle tests via gast-modus (/gast) — volledig lokaal, geen account/Supabase nodig. */
async function gaNaarGastDashboard(page: Page) {
  await page.goto("/gast");
  await page.waitForURL(/\/gast\/\d{4}-\d{2}/);
  await expect(page.getByRole("heading", { name: /Gezinsfinanciën/ })).toBeVisible();
}

function euroTekstNaarGetal(tekst: string): number {
  return Number(tekst.replace(/[^\d,.-]/g, "").replace(",", "."));
}

test.describe("Extra kost — betaalmethode (bankkaart/Visa/maaltijdcheque)", () => {
  test("de kiezer toont drie opties met Bankkaart standaard geselecteerd", async ({ page }) => {
    await gaNaarGastDashboard(page);
    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });

    const groep = dialoog.getByRole("radiogroup");
    await expect(groep.getByRole("radio", { name: "Bankkaart" })).toHaveAttribute("aria-checked", "true");
    await expect(groep.getByRole("radio", { name: "Visa" })).toHaveAttribute("aria-checked", "false");
    await expect(groep.getByRole("radio", { name: "Maaltijdcheque" })).toHaveAttribute("aria-checked", "false");
  });

  test("Maaltijdcheque: komt in Extra uitgaven met badge, en verlaagt 'Wat overblijft' NIET", async ({ page }) => {
    await gaNaarGastDashboard(page);
    const watOverblijftVoor = euroTekstNaarGetal(await page.getByTestId("samenvatting-watoverblijft").innerText());
    const openstaandVoor = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());

    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });
    await dialoog.getByLabel("Bedrag (€)").fill("12,50");
    await dialoog.getByLabel("Omschrijving").fill("Broodjeszaak");
    await dialoog.getByRole("radio", { name: "Maaltijdcheque" }).click();
    await dialoog.getByRole("button", { name: "Toevoegen" }).click();

    await expect(page.getByTestId("extra-kost-toast")).toContainText("€ 12,50 toegevoegd");
    const item = page.getByTestId("extra-uitgaven-lijst").locator("li", { hasText: "Broodjeszaak" });
    await expect(item).toBeVisible();
    await expect(item).toContainText("Maaltijdcheque");

    const watOverblijftNa = euroTekstNaarGetal(await page.getByTestId("samenvatting-watoverblijft").innerText());
    const openstaandNa = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());
    expect(watOverblijftNa).toBeCloseTo(watOverblijftVoor, 2);
    expect(openstaandNa).toBeCloseTo(openstaandVoor, 2);

    // "Ongedaan maken" blijft normaal werken voor deze betaalmethode.
    await page.getByTestId("extra-kost-toast").getByRole("button", { name: "Ongedaan maken" }).click();
    await expect(page.getByTestId("extra-uitgaven-lijst")).not.toContainText("Broodjeszaak");
  });

  test("Visa: komt in Facturen (niet Extra uitgaven), verhoogt openstaand bedrag, geen 'Ongedaan maken'", async ({
    page,
  }) => {
    await gaNaarGastDashboard(page);
    const openstaandVoor = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());

    await page.getByRole("button", { name: "Extra kost toevoegen" }).click();
    const dialoog = page.getByRole("dialog", { name: "Extra kost toevoegen" });
    await dialoog.getByLabel("Bedrag (€)").fill("40");
    await dialoog.getByLabel("Omschrijving").fill("Online aankoop");
    await dialoog.getByRole("radio", { name: "Visa" }).click();
    await expect(dialoog.getByText(/nog terugbetalen aan je kaart/)).toBeVisible();
    await dialoog.getByRole("button", { name: "Toevoegen" }).click();

    await expect(page.getByTestId("extra-kost-toast")).toContainText("toegevoegd aan Facturen");
    await expect(page.getByTestId("extra-kost-toast").getByRole("button", { name: "Ongedaan maken" })).toHaveCount(0);

    await expect(page.getByTestId("extra-uitgaven-lijst")).not.toContainText("Online aankoop");
    const facturenKaart = page.locator("#facturen");
    await expect(facturenKaart).toContainText("Online aankoop");
    await expect(facturenKaart).toContainText("Lening / krediet");

    const openstaandNa = euroTekstNaarGetal(await page.getByTestId("samenvatting-openstaand").innerText());
    expect(openstaandNa).toBeCloseTo(openstaandVoor + 40, 2);
  });
});

test.describe("Inkomen — maaltijdcheques als aparte bron", () => {
  test("telt niet mee bij Totaal inkomen, en toont een apart maaltijdcheques-blok zodra er iets ontvangen/besteed is", async ({
    page,
  }) => {
    await gaNaarGastDashboard(page);

    await expect(page.getByTestId("samenvatting-maaltijdcheques-over")).toHaveCount(0);
    const totaalVoor = euroTekstNaarGetal(await page.getByTestId("samenvatting-totaalinkomen").innerText());

    const inkomenKaart = page.locator("#inkomen");
    await inkomenKaart.getByRole("button", { name: "Toevoegen" }).click();
    await inkomenKaart.getByLabel("Bron").selectOption("maaltijdcheques");
    await inkomenKaart.getByLabel("Label").fill("Maaltijdcheques");
    await inkomenKaart.getByLabel("Bedrag (€)").fill("150");
    await inkomenKaart.getByLabel("Frequentie").selectOption("maandelijks");
    await inkomenKaart.getByRole("button", { name: "Opslaan" }).click();

    await expect(inkomenKaart).toContainText("Maaltijdcheques");

    // Totaal inkomen (regulier geld) blijft ongewijzigd — dat bedrag komt niet op de rekening.
    const totaalNa = euroTekstNaarGetal(await page.getByTestId("samenvatting-totaalinkomen").innerText());
    expect(totaalNa).toBeCloseTo(totaalVoor, 2);

    const maaltijdchequesKaart = page.getByTestId("samenvatting-maaltijdcheques-over");
    await expect(maaltijdchequesKaart).toBeVisible();
    await expect(maaltijdchequesKaart).toContainText("150.00");

    // Nu €20 besteden met maaltijdcheques via de "Extra uitgaven"-kaart zelf.
    const uitgavenKaart = page.locator("#uitgaven");
    await uitgavenKaart.getByRole("button", { name: "Toevoegen" }).click();
    await uitgavenKaart.getByLabel("Label").fill("Lunch");
    await uitgavenKaart.getByLabel("Bedrag (€)").fill("20");
    await uitgavenKaart.getByLabel("Betaald met").selectOption("maaltijdcheque");
    await uitgavenKaart.getByRole("button", { name: "Opslaan" }).click();

    await expect(uitgavenKaart).toContainText("Maaltijdcheque");
    await expect(page.getByTestId("samenvatting-maaltijdcheques-over")).toContainText("130.00");
  });
});
