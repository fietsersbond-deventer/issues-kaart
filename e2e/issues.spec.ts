import { test, expect, login, draw, selectCategory, selectTag, saveIssue, editIssue, apiHeaders } from "./fixtures.js";

for (const type of ["Point", "LineString", "Polygon"] as const) {
  test(`2 — create and persist ${type} with category and tags`, async ({ page, request }) => {
    await login(page);
    await page.getByRole("link", { name: "Nieuw onderwerp toevoegen", exact: true }).click();
    await page.getByLabel("Titel", { exact: true }).fill(`Nieuw ${type}`);
    await page.locator(".edit-form .ql-editor").fill(`Beschrijving ${type}`);
    await selectCategory(page, "E2E Verkeer");
    await selectTag(page, "Veilig");
    await draw(page, type);
    const saved = await saveIssue(page, "POST");
    expect(JSON.parse(saved.geometry).type).toBe(type);
    expect(saved.legend_id).toBe(101);
    expect(saved.tags).toEqual(["e2e-veilig"]);
    await page.reload();
    await expect(page.getByRole("heading", { name: `Nieuw ${type}`, exact: true })).toBeVisible();
    await expect(page.locator("article")).toContainText(`Beschrijving ${type}`);
    const persisted = await request.get(`/api/issues/${saved.id}`);
    const data = await persisted.json();
    expect(data.geometry.type).toBe(type);
    expect(data.tags).toEqual(["e2e-veilig"]);
    // The saved issue must also be discoverable in the list after navigation.
    await page.getByRole("link", { name: "Ga naar lijst", exact: true }).click();
    await page.getByLabel("Zoek", { exact: true }).fill(`Nieuw ${type}`);
    await expect(page.getByRole("cell", { name: `Nieuw ${type}`, exact: true })).toBeVisible();
  });
}

test("3 — cancel preserves saved content; validation and failed save preserve draft; save persists", async ({ page, request }) => {
  await login(page);
  await editIssue(page);
  await page.getByLabel("Titel", { exact: true }).fill("Geannuleerd");
  await page.locator(".edit-form .ql-editor").fill("Niet opslaan");
  await selectCategory(page, "E2E Parkeren");
  await selectTag(page, "Route");
  await draw(page, "Point", true);
  await page.getByRole("button", { name: "Annuleren", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "E2E Point", exact: true })).toBeVisible();
  const original = await (await request.get("/api/issues/101")).json();
  expect(original.title).toBe("E2E Point");
  expect(original.legend_id).toBe(101);
  expect(original.tags).toEqual(["e2e-veilig"]);

  await editIssue(page);
  await page.getByLabel("Titel", { exact: true }).fill("");
  await page.getByLabel("Titel", { exact: true }).blur();
  await expect(page.getByText("Titel is verplicht", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Opslaan", exact: true }).first()).toBeDisabled();
  await page.getByLabel("Titel", { exact: true }).fill("Bewaarde wijziging");
  await page.locator(".edit-form .ql-editor").fill("Gewijzigde beschrijving");
  await selectCategory(page, "E2E Parkeren");
  await selectTag(page, "Route");
  await draw(page, "Point", true);
  // Fault injection only for this error case; the subsequent save uses the real API.
  await page.route("**/api/issues/101", async (route) => {
    if (route.request().method() === "PATCH") await route.fulfill({ status: 503, json: { message: "Tijdelijk niet beschikbaar" } });
    else await route.continue();
  });
  const failed = page.waitForResponse((response) => response.request().method() === "PATCH");
  await page.getByRole("button", { name: "Opslaan", exact: true }).first().click();
  expect((await failed).status()).toBe(503);
  await expect(page.getByLabel("Titel", { exact: true })).toHaveValue("Bewaarde wijziging");
  expect((await (await request.get("/api/issues/101")).json()).title).toBe("E2E Point");
  await page.unroute("**/api/issues/101");
  const saved = await saveIssue(page, "PATCH");
  expect(saved.legend_id).toBe(102);
  expect(saved.tags).toContain("e2e-route");
  expect(JSON.parse(saved.geometry)).not.toEqual(original.geometry);
  await page.reload();
  await expect(page.locator("article")).toContainText("Gewijzigde beschrijving");
  await expect(page.locator("article")).toContainText("E2E Parkeren");
  await expect(page.locator("article")).toContainText("Route");
});

test("8 — cancel and confirm deletion; deny unauthenticated mutations and non-admin writes", async ({ page, request }) => {
  for (const method of ["POST", "PATCH", "DELETE"] as const) {
    const response = await request.fetch(method === "POST" ? "/api/issues" : "/api/issues/101", { method, data: { title: "Unauthorized" } });
    expect(response.status()).toBe(401);
  }
  const headers = await apiHeaders(request);
  expect((await request.patch("/api/admin/users/101", { headers, data: { username: "admin@example.test", role: "user" } })).status()).toBe(403);
  await login(page);
  await editIssue(page);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Verwijderen", exact: true }).first().click();
  expect((await request.get("/api/issues/101")).ok()).toBeTruthy();
  await expect(page.getByLabel("Titel", { exact: true })).toHaveValue("E2E Point");
  page.once("dialog", (dialog) => dialog.accept());
  const deleted = page.waitForResponse((response) => response.request().method() === "DELETE" && response.url().endsWith("/101"));
  await page.getByRole("button", { name: "Verwijderen", exact: true }).first().click();
  expect((await deleted).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/kaart$/);
  await page.reload();
  expect((await request.get("/api/issues/101")).status()).toBe(404);
  await page.getByRole("link", { name: "Ga naar lijst", exact: true }).click();
  await expect(page.getByRole("cell", { name: "E2E LineString", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "E2E Point", exact: true })).toHaveCount(0);
});
