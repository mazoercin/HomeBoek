import { test, expect } from "@playwright/test";

/**
 * "Account verwijderen"/"Download mijn gegevens" leven op /instellingen,
 * een pagina die een echte, ingelogde sessie vereist — niet bereikbaar
 * zonder live Supabase in deze omgeving. Wat hier wél zonder live
 * Supabase te toetsen valt: dat er in gast-modus nergens een
 * accountverwijder-affordance verschijnt (er is immers geen account),
 * en de mobiele kopbalk-knoppen rond deze taak (zie GastNavigatieBalk).
 * De disabled-until-valid-logica van VerwijderAccountFormulier
 * (wachtwoord + "VERWIJDEREN" moeten allebei kloppen) is enkel via
 * codereview geverifieerd — net als de viewer-uitsluiting in
 * dashboard-slepen.spec.ts.
 */
test.describe("Gast-modus: geen accountverwijdering mogelijk", () => {
  test("gast-dashboard toont geen 'Account verwijderen'", async ({ page }) => {
    await page.goto("/gast");
    await page.waitForURL(/\/gast\/\d{4}-\d{2}/);
    await expect(page.getByRole("heading", { name: /Gezinsfinanciën/ })).toBeVisible();
    await expect(page.getByText("Account verwijderen")).toHaveCount(0);
  });

  test("gast-banner legt uit dat gegevens enkel lokaal staan en hoe je ze wist", async ({ page }) => {
    await page.goto("/gast");
    await page.waitForURL(/\/gast\/\d{4}-\d{2}/);
    await expect(page.getByText(/Je probeert dit uit zonder account/)).toBeVisible();
    await expect(page.getByText(/enkel op dit\s*toestel bewaard/)).toBeVisible();
  });
});

test.describe("Gast-navigatiebalk: login bereikbaar op elk schermformaat", () => {
  test("'Inloggen'-link is zichtbaar (icoon minstens, tekst vanaf sm)", async ({ page }) => {
    await page.goto("/gast");
    const inlogLink = page.getByRole("link", { name: /Inloggen/ });
    await expect(inlogLink).toBeVisible();
    await inlogLink.click();
    await page.waitForURL(/\/login/);
  });

  test("'Account maken'-link blijft ook zichtbaar naast de inlogknop", async ({ page }) => {
    await page.goto("/gast");
    await expect(page.getByRole("link", { name: /Account/ }).first()).toBeVisible();
  });
});
