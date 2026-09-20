import { test, expect } from "@playwright/test";

/**
 * Enkel wat zonder een echt Supabase-project kan getest worden: routing/
 * rendering-gedrag dat geen geslaagde netwerkcall naar Supabase Auth
 * vereist. De onderliggende logica (nep-adres herkennen, rate-limit,
 * neutrale respons) staat in lib/auth/*.test.ts (Vitest).
 */

test.describe("Auth-callback zonder geldige code", () => {
  test("toont de foutpagina, nooit een lege pagina", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/auth\/foutieve-link/);
    await expect(page.getByText("Deze link werkt niet meer")).toBeVisible();
    await expect(page.getByRole("link", { name: "Vraag een nieuwe link aan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Naar inloggen" })).toBeVisible();
  });
});

test.describe("Wachtwoord vergeten — link en pagina", () => {
  test("'Wachtwoord vergeten?'-link staat op de loginpagina en leidt naar de juiste pagina", async ({ page }) => {
    await page.goto("/login");
    const link = page.getByRole("link", { name: "Wachtwoord vergeten?" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/wachtwoord-vergeten/);
    await expect(page.getByRole("heading", { name: "Wachtwoord vergeten" })).toBeVisible();
    await expect(page.getByLabel("Gebruikersnaam of e-mailadres")).toBeVisible();
  });

  test("leeg formulier: duidelijke invulfout, geen netwerkcall nodig (snelle validatie, geen 2s-wachttijd)", async ({ page }) => {
    await page.goto("/wachtwoord-vergeten");
    // Zelf leegmaken: het veld heeft ook een HTML5 "required", maar het
    // formulier gebruikt noValidate — de server-actie doet de echte check.
    await page.getByLabel("Gebruikersnaam of e-mailadres").fill("   ");
    await page.getByRole("button", { name: "Link versturen" }).click();
    await expect(page.getByText("Vul je gebruikersnaam of e-mailadres in.")).toBeVisible();
  });
});

test.describe("Registratie — optioneel e-mailadres", () => {
  test("e-mailveld is niet verplicht en toont de hint-tekst", async ({ page }) => {
    await page.goto("/registreren");
    const emailVeld = page.getByLabel("E-mailadres");
    await expect(emailVeld).toBeVisible();
    await expect(emailVeld).not.toHaveAttribute("required", "");
    await expect(page.getByText(/Optioneel\. Alleen nodig om je wachtwoord te herstellen/)).toBeVisible();
    await expect(page.getByText(/Mag verzonnen zijn — dit is wat je gebruikt om in te loggen\./)).toBeVisible();
  });

  test("leeg e-mailveld: waarschuwingskaart verschijnt en houdt de echte submit tegen", async ({ page }) => {
    await page.goto("/registreren");
    await page.getByLabel("Gebruikersnaam").fill("testgebruiker123");
    await page.getByLabel("Wachtwoord", { exact: true }).fill("wachtwoord123");
    await page.getByLabel("Wachtwoord bevestigen").fill("wachtwoord123");
    // E-mailveld bewust leeg gelaten.

    await page.getByRole("button", { name: "Account aanmaken" }).click();

    await expect(page.getByText("Zonder e-mailadres kan je je wachtwoord niet herstellen. Bewaar het goed.")).toBeVisible();
    const doorgaanKnop = page.getByRole("button", { name: "Toch doorgaan" });
    await expect(doorgaanKnop).toBeVisible();
    await expect(page.getByRole("button", { name: "Terug" })).toBeVisible();
    // Nog steeds op de registratiepagina — er is geen server-aanroep geweest.
    await expect(page).toHaveURL(/\/registreren/);
  });

  test("'Terug' op de waarschuwing brengt het gewone formulier weer terug", async ({ page }) => {
    await page.goto("/registreren");
    await page.getByLabel("Gebruikersnaam").fill("testgebruiker456");
    await page.getByLabel("Wachtwoord", { exact: true }).fill("wachtwoord123");
    await page.getByLabel("Wachtwoord bevestigen").fill("wachtwoord123");
    await page.getByRole("button", { name: "Account aanmaken" }).click();

    await expect(page.getByText("Zonder e-mailadres kan je je wachtwoord niet herstellen. Bewaar het goed.")).toBeVisible();
    await page.getByRole("button", { name: "Terug" }).click();

    await expect(page.getByRole("button", { name: "Account aanmaken" })).toBeVisible();
    await expect(page.getByText("Zonder e-mailadres kan je je wachtwoord niet herstellen. Bewaar het goed.")).not.toBeVisible();
  });

  test("ingevuld e-mailadres: geen waarschuwing, formulier gaat meteen naar de bezig-status", async ({ page }) => {
    await page.goto("/registreren");
    await page.getByLabel("Gebruikersnaam").fill("testgebruiker789");
    await page.getByLabel("E-mailadres").fill("test@voorbeeld.be");
    await page.getByLabel("Wachtwoord", { exact: true }).fill("wachtwoord123");
    await page.getByLabel("Wachtwoord bevestigen").fill("wachtwoord123");

    await page.getByRole("button", { name: "Account aanmaken" }).click();

    await expect(page.getByText("Zonder e-mailadres kan je je wachtwoord niet herstellen. Bewaar het goed.")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Bezig met registreren…" })).toBeVisible();
  });
});
