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
