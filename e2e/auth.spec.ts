import { test, expect } from "./fixtures.js";

test("1 — invalid login, session persistence and logout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mailadres of gebruikersnaam").fill("user@example.test");
  await page.getByLabel("Wachtwoord", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByText("Ongeldige gebruikersnaam of wachtwoord.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Uitloggen", exact: true })).toHaveCount(0);

  await page.getByLabel("Wachtwoord", { exact: true }).fill("E2e-password-123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Uitloggen", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Uitloggen", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Uitloggen", exact: true }).click();
  await expect(page.getByRole("link", { name: "Inloggen beheer", exact: true })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
