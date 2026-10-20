import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test, expect, runtime, password, login } from "./fixtures.js";

const newPassword = "Violet-Cycling-River-9027!";

test("10 — local email reset, single use, expired/invalid tokens and account privacy", async ({ page, request }) => {
  await page.goto("/reset-password");
  await page.getByLabel("E-mailadres", { exact: true }).fill("reset@example.test");
  await page.getByRole("button", { name: "Wachtwoord herstellen", exact: true }).click();
  const notice = page.getByText(/Als dit e-mailadres bij ons bekend is/);
  await expect(notice).toBeVisible();
  const message = await notice.textContent();
  await expect.poll(() => readFileSync(runtime().mailFile, "utf8")).toContain("reset@example.test");
  const mail: string = JSON.parse(readFileSync(runtime().mailFile, "utf8").trim().split("\n")[0]!);
  const link = mail.replace(/=\r\n/g, "").match(/http:\/\/127\.0\.0\.1:3100\/reset-password\/([a-f0-9]{64})/);
  expect(link).not.toBeNull();
  const token = link![1]!;
  await page.goto(`/reset-password/${token}`);
  await page.getByLabel("Nieuw wachtwoord", { exact: true }).fill(newPassword);
  await page.getByLabel("Bevestig wachtwoord", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Wachtwoord wijzigen", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?reset=success$/);
  expect((await request.post("/api/auth/login", { data: { username: "reset@example.test", password } })).status()).toBe(401);
  await login(page, "reset@example.test", newPassword);
  await page.getByRole("button", { name: "Uitloggen", exact: true }).click();

  for (const invalid of [token, "not-a-valid-token", "expired-e2e-token"]) {
    if (invalid === "expired-e2e-token") {
      const db = new DatabaseSync(runtime().dbPath);
      try {
        db.prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)").run(103, invalid, "2000-01-01T00:00:00.000Z");
      } finally { db.close(); }
    }
    await page.goto(`/reset-password/${invalid}`);
    await page.getByLabel("Nieuw wachtwoord", { exact: true }).fill(newPassword);
    await page.getByLabel("Bevestig wachtwoord", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Wachtwoord wijzigen", exact: true }).click();
    await expect(page.getByText("De link is ongeldig of verlopen. Vraag een nieuwe wachtwoord reset aan.", { exact: true })).toBeVisible();
  }
  await page.goto("/reset-password");
  await page.getByLabel("E-mailadres", { exact: true }).fill("unknown@example.test");
  await page.getByRole("button", { name: "Wachtwoord herstellen", exact: true }).click();
  await expect(notice).toHaveText(message!);
  expect(readFileSync(runtime().mailFile, "utf8").trim().split("\n")).toHaveLength(1);
});
