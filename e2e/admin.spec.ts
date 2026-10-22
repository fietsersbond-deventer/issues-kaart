import { apiHeaders } from "./support/api.js";
import { test, expect } from "./fixtures.js";

test("9 — admin manages users, categories, tags and texts; validation and role restrictions", async ({
  app,
  page,
  request,
}) => {
  await app.loginPage.login("admin@example.test");
  await app.users.goto();
  await app.users.editButton("user@example.test").click();
  await app.users.selectRole("Administrator");
  await app.users.save();
  await expect(app.users.roleCell("user@example.test", "admin")).toBeVisible();
  await page.reload();
  await expect(app.users.roleCell("user@example.test", "admin")).toBeVisible();

  await app.categories.goto();
  await app.categories.create();
  const invalid = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/legends") &&
      response.request().method() === "POST",
  );
  await app.categories.submit();
  expect((await invalid).status()).toBe(400);
  await expect(app.categories.dialog).toBeVisible();
  await app.categories.name.fill("E2E Nieuwe categorie");
  await app.categories.submit();
  await expect(app.categories.cell("E2E Nieuwe categorie")).toBeVisible();
  await page.reload();
  await expect(app.categories.cell("E2E Nieuwe categorie")).toBeVisible();
  const headers = await apiHeaders(request, "admin@example.test");
  const inUse = await request.delete("/api/legends/101", { headers });
  expect(inUse.status()).toBe(400);
  expect((await inUse.json()).message).toContain("in gebruik");

  await app.tags.goto();
  await app.tags.create();
  await app.tags.label.fill("E2E Nieuw label");
  await app.tags.description.fill("Voor browsercontrole");
  await app.tags.submit();
  await expect(app.tags.cell("E2E Nieuw label")).toBeVisible();
  await page.reload();
  await expect(app.tags.cell("E2E Nieuw label")).toBeVisible();

  await app.texts.goto();
  await app.texts.edit("navbar.header");
  await app.texts.text.fill("E2E Aangepaste kop");
  await app.texts.submit();
  await expect(app.texts.dialog).toHaveCount(0);
  await page.reload();
  await expect(app.header.heading).toHaveText("E2E Aangepaste kop");

  // Restore the ordinary account's role, then verify the actual forbidden boundary.
  expect(
    (
      await request.patch("/api/admin/users/102", {
        headers,
        data: { username: "user@example.test", name: "E2E User", role: "user" },
      })
    ).ok(),
  ).toBeTruthy();
  await app.header.logout();
  await app.loginPage.login();
  await app.users.goto();
  await expect(page).toHaveURL(/\/admin\/legends$/);
  await expect(app.users.createButton).toHaveCount(0);
  await app.tags.goto();
  await expect(page).toHaveURL(/\/admin\/tags$/);
  const ordinaryHeaders = await apiHeaders(request);
  expect(
    (
      await request.get("/api/admin/users", { headers: ordinaryHeaders })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/tags", {
        headers: ordinaryHeaders,
        data: { tag: "allowed" },
      })
    ).ok(),
  ).toBeTruthy();
  // Tags/categories/texts APIs are intentionally available to authenticated ordinary users; only user management is admin-only.
});

test("GeoJSON preview imports selected layers and creates categories only on confirmation", async ({ app, page, request }) => {
  await app.loginPage.login("admin@example.test");
  await app.issueMap.goto();
  await page.getByRole("link", { name: "Beheer", exact: true }).click();
  await page.getByRole("link", { name: "GeoJSON importeren" }).click();
  const data = { type: "FeatureCollection", features: [
    { type: "Feature", properties: { plein_park: "Park" }, geometry: { type: "MultiPoint", coordinates: [[4.9,52.3],[4.91,52.31]] } },
    { type: "Feature", properties: { plein_park: "Plein" }, geometry: { type: "Point", coordinates: [4.92,52.32] } },
    { type: "Feature", properties: { plein_park: "Overslaan" }, geometry: { type: "Point", coordinates: [4.93,52.33] } },
  ] };
  await expect(page.getByLabel("Titel (standaard voor ieder object)")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Verder naar instellingen", exact: true })).toBeDisabled();
  await page.locator('input[type="file"]').setInputFiles({ name: "gemeente.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByRole("button", { name: "Verder naar instellingen", exact: true }).click();
  await expect(page.locator('input[type="file"]')).not.toBeVisible();
  await page.getByLabel("Titel (standaard voor ieder object)").fill("Importvoorbeeldtest");
  await page.getByLabel("Beschrijving", { exact: true }).fill("Gemeentelijke dataset");
  await page.getByLabel("Categorie-indeling", { exact: true }).press("Enter");
  await page.getByRole("option", { name: "plein_park", exact: true }).click();
  await page.getByRole("button", { name: "Bekijk importvoorbeeld", exact: true }).click();
  await expect(page.getByText("3 beschikbare objecten → 4 bewerkbare meldingen.")).toBeVisible();
  expect((await (await request.get("/api/issues?fields=id")).json()).length).toBe(3);
  await expect(page.getByLabel("Nieuwe categorie voor Park", { exact: true })).toHaveValue("Park");
  await expect(page.getByLabel("Nieuwe categorie voor Plein", { exact: true })).toHaveValue("Plein");
  await page.getByRole("button", { name: "Selectie wissen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Importeer 0 meldingen", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Importeer Park", exact: true }).check();
  await page.getByRole("checkbox", { name: "Importeer Plein", exact: true }).check();
  await expect(page.getByLabel("Nieuwe categorie voor Overslaan", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Vorige", exact: true }).click();
  await expect(page.getByLabel("Titel (standaard voor ieder object)")).toHaveValue("Importvoorbeeldtest");
  await page.getByRole("button", { name: "Bekijk importvoorbeeld", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Importeer Overslaan", exact: true })).not.toBeChecked();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath("import-stepper.png"), fullPage: true });
  await page.getByRole("button", { name: "Importeer 3 meldingen", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "3 meldingen geïmporteerd." })).toBeVisible();
  const rows = await (await request.get("/api/issues?fields=id,title,legend_id")).json();
  const categories = await (await request.get("/api/legends")).json();
  expect(categories.some((category: { name: string }) => category.name === "Overslaan")).toBe(false);
  const parks = categories.find((category: { name: string }) => category.name === "Park");
  const squares = categories.find((category: { name: string }) => category.name === "Plein");
  expect(rows.filter((row: { legend_id: number }) => row.legend_id === parks.id)).toHaveLength(2);
  expect(rows.filter((row: { legend_id: number }) => row.legend_id === squares.id)).toHaveLength(1);
  await page.getByRole("link", { name: "Naar de kaart", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Park\b/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^Plein\b/ })).toBeVisible();
});

test("GeoJSON joins road blocks in preview and imports one editable continuous line", async ({ app, page, request }) => {
  await app.loginPage.login("admin@example.test");
  await page.goto("/admin/import");
  const line = (coordinates: number[][], network = "Plus") => ({ type: "Feature", properties: { STT_NAAM: "Teststraat", network }, geometry: { type: "LineString", coordinates } });
  const data = { type: "FeatureCollection", features: [line([[6.15,52.25],[6.16,52.25]]), line([[6.17,52.25],[6.16,52.25]]), line([[6.17,52.25],[6.18,52.25]], "Hoofd")] };
  await page.locator('input[type="file"]').setInputFiles({ name: "roads.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByRole("button", { name: "Verder naar instellingen", exact: true }).click();
  const merge = page.getByRole("checkbox", { name: "Aansluitende lijnsegmenten samenvoegen", exact: true });
  await expect(merge).toBeChecked();
  await page.getByLabel("Titel (standaard voor ieder object)").fill("Road dataset");
  await page.getByLabel("Beschrijving", { exact: true }).fill("Gemeentelijke wegen");
  await page.getByLabel("Categorie", { exact: true }).press("Enter");
  await page.getByRole("option").filter({ hasText: "E2E Verkeer" }).click();
  const inspect = page.getByRole("button", { name: "Bekijk importvoorbeeld", exact: true });
  await inspect.click();
  await expect(page.getByText("Lijnsegmenten: 3 → 2 lijnen na samenvoegen.")).toBeVisible();
  await page.getByRole("button", { name: "Vorige", exact: true }).click();
  await merge.uncheck();
  await expect(page.getByText("Importvoorbeeld", { exact: true })).toHaveCount(0);
  await inspect.click();
  await expect(page.getByText("Lijnsegmenten: 3 → 3 lijnen (samenvoegen uit).")).toBeVisible();
  await page.getByRole("button", { name: "Vorige", exact: true }).click();
  await merge.check();
  await inspect.click();
  await page.getByRole("button", { name: "Importeer 2 meldingen", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "2 meldingen geïmporteerd." })).toBeVisible();
  const rows = await (await request.get("/api/issues?fields=id,title,geometry")).json();
  const roads = rows.filter((row: { title: string }) => row.title === "Teststraat");
  expect(roads).toHaveLength(2);
  const joined = roads.find((row: { geometry: { coordinates: number[][] } }) => row.geometry.coordinates.length === 3);
  expect(joined.geometry.coordinates).toEqual([[6.15,52.25],[6.16,52.25],[6.17,52.25]]);
  await app.issueMap.editIssue(joined.id);
  await app.issueMap.editor.title.fill("Doorlopende straat");
  await app.issueMap.editor.saveSuccessfully("PATCH");
});
