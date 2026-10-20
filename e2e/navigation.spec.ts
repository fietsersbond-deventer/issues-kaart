import { test, expect, login, renderedPoint } from "./fixtures.js";

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  const mobile = viewport.width < 600;
  test(`4 — list, deep links, history and map controls (${mobile ? "mobile" : "desktop"})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await page.goto("/lijst");
    await page.getByRole("cell", { name: "E2E Point", exact: true }).click();
    await expect(page).toHaveURL(/\/kaart\/101$/);
    await expect(page.getByRole("heading", { name: "E2E Point", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("cell", { name: "E2E Point", exact: true })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "E2E Point", exact: true })).toBeVisible();
    await page.goto("/kaart/103");
    await expect(page.getByRole("heading", { name: "E2E Polygon", exact: true })).toBeVisible();
    if (mobile) {
      await page.getByRole("button", { name: "Onderpaneel uitklappen", exact: true }).press("Enter");
      await expect(page.getByRole("button", { name: "Onderpaneel inklappen", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Onderpaneel inklappen", exact: true }).press("Enter");
      await page.getByRole("button", { name: "Kaartlagen en legenda openen", exact: true }).click();
    }
    await page.getByRole("button", { name: "Kaartlaag Foto", exact: true }).click();
    await expect(page.getByRole("button", { name: "Kaartlaag Foto", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    if (mobile) await page.getByRole("button", { name: "Kaartlagen en legenda openen", exact: true }).click();
    await expect(page.getByRole("button", { name: "Kaartlaag Foto", exact: true })).toHaveAttribute("aria-pressed", "true");
    if (mobile) await page.getByRole("button", { name: "Kaartlagen en legenda sluiten", exact: true }).click();
    await page.getByTitle("Toon alle onderwerpen", { exact: true }).click();
    await expect(page.getByTestId("issue-map").locator("canvas").first()).toBeVisible();
    // A missing ID must never leave the previous issue in the details panel.
    expect((await request.get("/api/issues/999999")).status()).toBe(404);
    await page.goto("/kaart/999999");
    await expect(page.getByRole("heading", { name: "E2E Polygon", exact: true })).toHaveCount(0);
    await expect(page.getByText("Onderwerp niet gevonden", { exact: true })).toBeVisible();
  });

  test(`5 — search, combined category/tag filters, reset and URL selection (${mobile ? "mobile" : "desktop"})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/lijst");
    await page.getByLabel("Zoek", { exact: true }).fill("Point");
    await expect(page.getByRole("cell", { name: "E2E Point", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "E2E LineString", exact: true })).toHaveCount(0);
    await page.getByRole("cell", { name: "E2E Point", exact: true }).click();
    await expect(page.getByRole("heading", { name: "E2E Point", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByLabel("Zoek", { exact: true })).toHaveValue("Point");
    await page.getByLabel("Zoek", { exact: true }).fill("geen-bestaand-onderwerp");
    await expect(page.getByText("Geen gegevens beschikbaar", { exact: true })).toBeVisible();
    await page.getByLabel("Zoek", { exact: true }).fill("");
    await expect(page.getByRole("cell", { name: "E2E Polygon", exact: true })).toBeVisible();
    await page.goto("/kaart");
    if (mobile) await page.getByRole("button", { name: "Kaartlagen en legenda openen", exact: true }).click();
    await page.getByRole("checkbox", { name: /E2E Verkeer/ }).click();
    await page.getByRole("checkbox", { name: /Veilig/ }).click();
    await expect(page).toHaveURL(/cat=101/);
    await expect(page).toHaveURL(/tag=e2e-veilig/);
    await expect(page.getByRole("checkbox", { name: /E2E Parkeren/ })).toHaveAttribute("aria-checked", "false");
    if (mobile) await page.getByRole("button", { name: "Kaartlagen en legenda sluiten", exact: true }).click();
    await expect(page.getByRole("button", { name: /1 plek op de kaart/ })).toBeVisible();
    const query = new URL(page.url()).search;
    // The one remaining point is focused in the visible area. Click the actual canvas.
    const pixel = await renderedPoint(page);
    await page.mouse.click(pixel.x, pixel.y);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/kaart/101");
    expect(new URL(page.url()).search).toBe(query);
    await expect(page.getByRole("heading", { name: "E2E Point", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /1 plek op de kaart/ }).click();
    await expect(page).not.toHaveURL(/cat=|tag=/);
    await page.goto("/kaart?cat=102&tag=e2e-route");
    await expect(page.getByRole("button", { name: /0 plekken op de kaart/ })).toBeVisible();
    await page.getByRole("button", { name: /0 plekken op de kaart/ }).click();
    await expect(page).not.toHaveURL(/cat=|tag=/);
  });
}

test("3 — mobile editor remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/kaart/101");
  await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await page.getByLabel("Titel", { exact: true }).fill("Mobiel concept");
  await page.getByRole("button", { name: "Annuleren", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "E2E Point", exact: true })).toBeVisible();
});
