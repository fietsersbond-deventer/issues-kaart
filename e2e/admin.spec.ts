import { test, expect, login, apiHeaders } from "./fixtures.js";

test("9 — admin manages users, categories, tags and texts; validation and role restrictions", async ({
  page,
  request,
}) => {
  await login(page, "admin@example.test");
  await page.goto("/admin/users");
  const userRow = page
    .getByRole("row")
    .filter({ hasText: "user@example.test" });
  await userRow
    .getByRole("button", { name: "Gebruiker bewerken", exact: true })
    .click();
  await page.getByLabel("Rol", { exact: true }).press("Enter");
  await page
    .getByRole("option", { name: "Administrator", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Opslaan", exact: true })
    .click();
  await expect(
    userRow.getByRole("cell", { name: "admin", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "user@example.test" })
      .getByRole("cell", { name: "admin", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/legends");
  await page
    .getByRole("button", { name: "Voeg Categorie toe", exact: true })
    .click();
  const categoryDialog = page.getByRole("dialog");
  const invalid = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/legends") &&
      response.request().method() === "POST",
  );
  await categoryDialog
    .getByRole("button", { name: "Opslaan", exact: true })
    .first()
    .click();
  expect((await invalid).status()).toBe(400);
  await expect(categoryDialog).toBeVisible();
  await categoryDialog
    .getByLabel("Naam", { exact: true })
    .fill("E2E Nieuwe categorie");
  await categoryDialog
    .getByRole("button", { name: "Opslaan", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("cell", { name: "E2E Nieuwe categorie", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "E2E Nieuwe categorie", exact: true }),
  ).toBeVisible();
  const headers = await apiHeaders(request, "admin@example.test");
  const inUse = await request.delete("/api/legends/101", { headers });
  expect(inUse.status()).toBe(400);
  expect((await inUse.json()).message).toContain("in gebruik");

  await page.goto("/admin/tags");
  await page.getByRole("button", { name: "Nieuwe tag", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Label", { exact: true })
    .fill("E2E Nieuw label");
  await page
    .getByRole("dialog")
    .getByLabel("Omschrijving", { exact: true })
    .fill("Voor browsercontrole");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Opslaan", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "E2E Nieuw label", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "E2E Nieuw label", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/texts");
  await page
    .getByRole("button", { name: "navbar.header bewerken", exact: true })
    .click();
  await page.getByLabel("Tekst", { exact: true }).fill("E2E Aangepaste kop");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Opslaan", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".header-link")).toHaveText("E2E Aangepaste kop");

  // Restore the ordinary account's role, then verify the actual forbidden boundary.
  expect(
    (
      await request.patch("/api/admin/users/102", {
        headers,
        data: { username: "user@example.test", name: "E2E User", role: "user" },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Uitloggen", exact: true }).click();
  await login(page);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/legends$/);
  await expect(
    page.getByRole("button", { name: "Nieuwe gebruiker", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin/tags");
  await expect(page).toHaveURL(/\/admin\/legends$/);
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
