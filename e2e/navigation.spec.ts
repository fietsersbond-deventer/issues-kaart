import { test, expect } from "./fixtures.js";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  const mobile = viewport.width < 600;
  test(`4 — list, deep links, history and map controls (${mobile ? "mobile" : "desktop"})`, async ({
    app,
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    await app.issueList.goto();
    await app.issueList.issueCell("E2E Point").click();
    await expect(page).toHaveURL(/\/kaart\/101$/);
    await expect(app.issueMap.details.heading("E2E Point")).toBeVisible();
    await page.goBack();
    await expect(app.issueList.issueCell("E2E Point")).toBeVisible();
    await page.goForward();
    await expect(app.issueMap.details.heading("E2E Point")).toBeVisible();
    await app.issueMap.goto(103);
    await expect(app.issueMap.details.heading("E2E Polygon")).toBeVisible();
    if (mobile) {
      await app.issueMap.expandPanel.press("Enter");
      await expect(app.issueMap.collapsePanel).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await app.issueMap.collapsePanel.press("Enter");
      await app.issueMap.filters.open();
    }
    await app.issueMap.filters.photoLayer.click();
    await expect(app.issueMap.filters.photoLayer).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.reload();
    if (mobile) await app.issueMap.filters.open();
    await expect(app.issueMap.filters.photoLayer).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    if (mobile) await app.issueMap.filters.close();
    await app.issueMap.filters.showAll();
    await expect(app.issueMap.map.canvas).toBeVisible();
    // A missing ID must never leave the previous issue in the details panel.
    expect((await request.get("/api/issues/999999")).status()).toBe(404);
    await app.issueMap.goto(999999);
    await expect(app.issueMap.details.heading("E2E Polygon")).toHaveCount(0);
    await expect(app.issueMap.details.notFound).toBeVisible();
  });

  test(`5 — search, combined category/tag filters, reset and URL selection (${mobile ? "mobile" : "desktop"})`, async ({
    app,
    page,
  }) => {
    await page.setViewportSize(viewport);
    await app.issueList.goto();
    await app.issueList.search.fill("Point");
    await expect(app.issueList.issueCell("E2E Point")).toBeVisible();
    await expect(app.issueList.issueCell("E2E LineString")).toHaveCount(0);
    await app.issueList.issueCell("E2E Point").click();
    await expect(app.issueMap.details.heading("E2E Point")).toBeVisible();
    await page.goBack();
    await expect(app.issueList.search).toHaveValue("Point");
    await app.issueList.search.fill("geen-bestaand-onderwerp");
    await expect(app.issueList.empty).toBeVisible();
    await app.issueList.search.fill("");
    await expect(app.issueList.issueCell("E2E Polygon")).toBeVisible();
    await app.issueMap.goto();
    if (mobile) await app.issueMap.filters.open();
    await app.issueMap.filters.checkbox(/E2E Verkeer/).click();
    await app.issueMap.filters.checkbox(/Veilig/).click();
    await expect(page).toHaveURL(/cat=101/);
    await expect(page).toHaveURL(/tag=e2e-veilig/);
    await expect(app.issueMap.filters.checkbox(/E2E Parkeren/)).toHaveAttribute(
      "aria-checked",
      "false",
    );
    if (mobile) await app.issueMap.filters.close();
    await expect(app.issueMap.filters.count(1)).toBeVisible();
    const query = new URL(page.url()).search;
    // The one remaining point is focused in the visible area. Click the actual canvas.
    await app.issueMap.map.clickRenderedPoint();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/kaart/101");
    expect(new URL(page.url()).search).toBe(query);
    await expect(app.issueMap.details.heading("E2E Point")).toBeVisible();
    await app.issueMap.filters.count(1).click();
    await expect(page).not.toHaveURL(/cat=|tag=/);
    await app.issueMap.goto(undefined, "?cat=102&tag=e2e-route");
    await expect(app.issueMap.filters.count(0)).toBeVisible();
    await app.issueMap.filters.count(0).click();
    await expect(page).not.toHaveURL(/cat=|tag=/);
  });
}

test("3 — mobile editor remains usable", async ({ app, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await app.loginPage.login();
  await app.issueMap.goto(101);
  await app.issueMap.details.edit();
  await app.issueMap.editor.title.fill("Mobiel concept");
  await app.issueMap.editor.cancel();
  await expect(app.issueMap.details.heading("E2E Point")).toBeVisible();
});
