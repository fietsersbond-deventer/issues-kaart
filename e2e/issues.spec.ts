import { apiHeaders } from "./support/api.js";
import { test, expect } from "./fixtures.js";

for (const type of ["Point", "LineString", "Polygon"] as const) {
  test(`2 — create and persist ${type} with category and tags`, async ({
    app,
    page,
    request,
  }) => {
    await app.loginPage.login();
    await app.header.addIssue();
    await app.issueMap.editor.title.fill(`Nieuw ${type}`);
    await app.issueMap.editor.description.fill(`Beschrijving ${type}`);
    await app.issueMap.editor.selectCategory("E2E Verkeer");
    await app.issueMap.editor.selectTag("Veilig");
    await app.issueMap.map.draw(type);
    const saved = await app.issueMap.editor.saveSuccessfully("POST");
    expect(JSON.parse(saved.geometry).type).toBe(type);
    expect(saved.legend_id).toBe(101);
    expect(saved.tags).toEqual(["e2e-veilig"]);
    await page.reload();
    await expect(app.issueMap.details.heading(`Nieuw ${type}`)).toBeVisible();
    await expect(app.issueMap.details.article).toContainText(
      `Beschrijving ${type}`,
    );
    const persisted = await request.get(`/api/issues/${saved.id}`);
    const data = await persisted.json();
    expect(data.geometry.type).toBe(type);
    expect(data.tags).toEqual(["e2e-veilig"]);
    // The saved issue must also be discoverable in the list after navigation.
    await app.header.openList();
    await app.issueList.search.fill(`Nieuw ${type}`);
    await expect(app.issueList.issueCell(`Nieuw ${type}`)).toBeVisible();
  });
}

test("3 — cancel preserves saved content; validation and failed save preserve draft; save persists", async ({
  app,
  page,
  request,
}) => {
  await app.loginPage.login();
  await app.issueMap.editIssue();
  await app.issueMap.editor.title.fill("Geannuleerd");
  await app.issueMap.editor.description.fill("Niet opslaan");
  await app.issueMap.editor.selectCategory("E2E Parkeren");
  await app.issueMap.editor.selectTag("Route");
  await app.issueMap.map.draw("Point", true);
  await app.issueMap.editor.cancel();
  await expect(app.issueMap.details.heading("E2E Point")).toBeVisible();
  const original = await (await request.get("/api/issues/101")).json();
  expect(original.title).toBe("E2E Point");
  expect(original.legend_id).toBe(101);
  expect(original.tags).toEqual(["e2e-veilig"]);

  await app.issueMap.editIssue();
  await app.issueMap.editor.title.fill("");
  await app.issueMap.editor.title.blur();
  await expect(app.issueMap.editor.requiredTitle).toBeVisible();
  await expect(app.issueMap.editor.saveButton).toBeDisabled();
  await app.issueMap.editor.title.fill("Bewaarde wijziging");
  await app.issueMap.editor.description.fill("Gewijzigde beschrijving");
  await app.issueMap.editor.selectCategory("E2E Parkeren");
  await app.issueMap.editor.selectTag("Route");
  await app.issueMap.map.draw("Point", true);
  // Fault injection only for this error case; the subsequent save uses the real API.
  await page.route("**/api/issues/101", async (route) => {
    if (route.request().method() === "PATCH")
      await route.fulfill({
        status: 503,
        json: { message: "Tijdelijk niet beschikbaar" },
      });
    else await route.continue();
  });
  const failed = page.waitForResponse(
    (response) => response.request().method() === "PATCH",
  );
  await app.issueMap.editor.submit();
  expect((await failed).status()).toBe(503);
  await expect(app.issueMap.editor.title).toHaveValue("Bewaarde wijziging");
  expect((await (await request.get("/api/issues/101")).json()).title).toBe(
    "E2E Point",
  );
  await page.unroute("**/api/issues/101");
  const saved = await app.issueMap.editor.saveSuccessfully("PATCH");
  expect(saved.legend_id).toBe(102);
  expect(saved.tags).toContain("e2e-route");
  expect(JSON.parse(saved.geometry)).not.toEqual(original.geometry);
  await page.reload();
  await expect(app.issueMap.details.article).toContainText(
    "Gewijzigde beschrijving",
  );
  await expect(app.issueMap.details.article).toContainText("E2E Parkeren");
  await expect(app.issueMap.details.article).toContainText("Route");
});

test("8 — cancel and confirm deletion; deny unauthenticated mutations and non-admin writes", async ({
  app,
  page,
  request,
}) => {
  for (const method of ["POST", "PATCH", "DELETE"] as const) {
    const response = await request.fetch(
      method === "POST" ? "/api/issues" : "/api/issues/101",
      { method, data: { title: "Unauthorized" } },
    );
    expect(response.status()).toBe(401);
  }
  const headers = await apiHeaders(request);
  expect(
    (
      await request.patch("/api/admin/users/101", {
        headers,
        data: { username: "admin@example.test", role: "user" },
      })
    ).status(),
  ).toBe(403);
  await app.loginPage.login();
  await app.issueMap.editIssue();
  await app.issueMap.editor.delete(false);
  expect((await request.get("/api/issues/101")).ok()).toBeTruthy();
  await expect(app.issueMap.editor.title).toHaveValue("E2E Point");
  const deleted = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      response.url().endsWith("/101"),
  );
  await app.issueMap.editor.delete(true);
  expect((await deleted).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/kaart$/);
  await page.reload();
  expect((await request.get("/api/issues/101")).status()).toBe(404);
  await app.header.openList();
  await expect(app.issueList.issueCell("E2E LineString")).toBeVisible();
  await expect(app.issueList.issueCell("E2E Point")).toHaveCount(0);
});
