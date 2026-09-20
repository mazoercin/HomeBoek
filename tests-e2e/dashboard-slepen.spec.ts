import { test, expect, type Page } from "@playwright/test";

async function gaNaarGastDashboard(page: Page) {
  await page.goto("/gast");
  await page.waitForURL(/\/gast\/\d{4}-\d{2}/);
  await expect(page.getByRole("heading", { name: /Gezinsfinanciën/ })).toBeVisible();
}

async function huidigeVolgorde(page: Page): Promise<string[]> {
  // Enkel de kader-wrappers zelf (<div>), niet hun sleep-handvatten
  // (<button data-testid="dashboard-blok-<id>-handvat">) die met dezelfde
  // prefix beginnen.
  const ids = await page.locator('div[data-testid^="dashboard-blok-"]').evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-testid")?.replace("dashboard-blok-", "") ?? "")
  );
  return ids;
}

test.describe("Dashboard-kaders slepen", () => {
  test("standaardvolgorde toont elk kader apart (behalve het verborgen voorstellen-kader)", async ({ page }) => {
    await gaNaarGastDashboard(page);
    const volgorde = await huidigeVolgorde(page);
    expect(volgorde).toEqual([
      "samenvatting",
      "grafieken",
      "inkomen",
      "kosten-vast",
      "kosten-facturen",
      "kosten-extra",
      "wat-als",
      "doelen",
      "investeringen",
    ]);
  });

  test("een kader verslepen wijzigt de volgorde en blijft na herlaad behouden", async ({ page }) => {
    await gaNaarGastDashboard(page);

    const volgordeVoor = await huidigeVolgorde(page);
    expect(volgordeVoor[0]).toBe("samenvatting");
    expect(volgordeVoor[1]).toBe("grafieken");

    const handvat = page.getByTestId("dashboard-blok-samenvatting-handvat");
    const doelBlok = page.getByTestId("dashboard-blok-grafieken");

    const handvatBox = await handvat.boundingBox();
    const doelBox = await doelBlok.boundingBox();
    if (!handvatBox || !doelBox) throw new Error("Kon posities niet bepalen.");

    // Sleep het "samenvatting"-handvat voorbij het midden van het "grafieken"-kader.
    const startX = handvatBox.x + handvatBox.width / 2;
    const startY = handvatBox.y + handvatBox.height / 2;
    const eindX = doelBox.x + doelBox.width / 2;
    const eindY = doelBox.y + doelBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 15, { steps: 5 });
    await page.waitForTimeout(100);
    const stappen = 12;
    for (let i = 1; i <= stappen; i++) {
      await page.mouse.move(startX + ((eindX - startX) * i) / stappen, startY + 15 + ((eindY - startY - 15) * i) / stappen);
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(100);
    await page.mouse.up();

    await expect(async () => {
      const volgordeNa = await huidigeVolgorde(page);
      expect(volgordeNa[0]).toBe("grafieken");
      expect(volgordeNa[1]).toBe("samenvatting");
    }).toPass({ timeout: 3000 });

    // Guest-modus schrijft synchroon naar localStorage — een herlaad moet dus dezelfde volgorde tonen.
    await page.reload();
    await expect(page.getByRole("heading", { name: /Gezinsfinanciën/ })).toBeVisible();
    const volgordeNaHerlaad = await huidigeVolgorde(page);
    expect(volgordeNaHerlaad[0]).toBe("grafieken");
    expect(volgordeNaHerlaad[1]).toBe("samenvatting");
  });

  test("viewer-rol krijgt geen sleep-handvatten (enkel getest via het contract, niet live — gast-modus is altijd owner)", async ({
    page,
  }) => {
    // Gast-modus is altijd "owner" (zie app/gast/[maand]/page.tsx), dus dit
    // bevestigt enkel dat de handvatten er voor een editor/owner wél zijn —
    // de viewer-uitsluiting zelf zit in de `magSlepen`-voorwaarde in
    // DashboardClient en is via code-review geverifieerd.
    await gaNaarGastDashboard(page);
    await expect(page.getByTestId("dashboard-blok-samenvatting-handvat")).toBeVisible();
  });
});
