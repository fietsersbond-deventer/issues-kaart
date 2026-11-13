import { test, expect } from "./fixtures.js";

test("1 — invalid login, session persistence and logout", async ({
  app,
  page,
}) => {
  await app.loginPage.goto();
  await app.loginPage.submit("user@example.test", "incorrect-password");
  await expect(app.loginPage.error).toBeVisible();
  await expect(app.header.logoutButton).toHaveCount(0);

  await app.loginPage.submit("user@example.test", "E2e-password-123!");
  await expect(app.header.logoutButton).toBeVisible();
  await page.reload();
  await expect(app.header.logoutButton).toBeVisible();
  await app.header.logout();
  await expect(app.header.loginLink).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
