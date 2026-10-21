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

test("GeoJSON preview separates attribute groups and creates categories only on confirmation", async ({ app, page, request }) => {
  await app.loginPage.login("admin@example.test");
  await app.issueMap.goto();
  await page.getByRole("link", { name: "Beheer", exact: true }).click();
  await page.getByRole("link", { name: "GeoJSON importeren" }).click();
  const data = { type: "FeatureCollection", features: [
    { type: "Feature", properties: { plein_park: "Park" }, geometry: { type: "MultiPoint", coordinates: [[4.9,52.3],[4.91,52.31]] } },
    { type: "Feature", properties: { plein_park: "Plein" }, geometry: { type: "Point", coordinates: [4.92,52.32] } },
  ] };
  await page.locator('input[type="file"]').setInputFiles({ name: "gemeente.geojson", mimeType: "application/geo+json", buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByLabel("Titel (standaard voor ieder object)").fill("Importvoorbeeldtest");
  await page.getByLabel("Beschrijving", { exact: true }).fill("Gemeentelijke dataset");
  await page.getByLabel("Categorie-indeling", { exact: true }).press("Enter");
  await page.getByRole("option", { name: "plein_park", exact: true }).click();
  await page.getByRole("button", { name: "Bekijk importvoorbeeld", exact: true }).click();
  await expect(page.getByText("2 objecten na laagselectie → 3 bewerkbare meldingen.")).toBeVisible();
  expect((await (await request.get("/api/issues?fields=id")).json()).length).toBe(3);
  await expect(page.getByLabel("Nieuwe categorie voor Park", { exact: true })).toHaveValue("Park");
  await expect(page.getByLabel("Nieuwe categorie voor Plein", { exact: true })).toHaveValue("Plein");
  await page.getByRole("button", { name: "Importeer 3 meldingen", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "3 meldingen geïmporteerd." })).toBeVisible();
  const rows = await (await request.get("/api/issues?fields=id,title,legend_id")).json();
  const categories = await (await request.get("/api/legends")).json();
  const parks = categories.find((category: { name: string }) => category.name === "Park");
  const squares = categories.find((category: { name: string }) => category.name === "Plein");
  expect(rows.filter((row: { legend_id: number }) => row.legend_id === parks.id)).toHaveLength(2);
  expect(rows.filter((row: { legend_id: number }) => row.legend_id === squares.id)).toHaveLength(1);
  await page.getByRole("link", { name: "Naar de kaart", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Park\b/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^Plein\b/ })).toBeVisible();
});
