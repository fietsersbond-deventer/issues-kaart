import {
  receivedMessages,
  resetTokenFor,
  insertExpiredResetToken,
} from "./support/passwordReset.js";
import { test, expect, password } from "./fixtures.js";

const newPassword = "Violet-Cycling-River-9027!";

test("10 — local email reset, single use, expired/invalid tokens and account privacy", async ({
  app,
  page,
  request,
}) => {
  await app.passwordReset.goto();
  await app.passwordReset.requestReset("reset@example.test");
  const notice = app.passwordReset.notice;
  await expect(notice).toBeVisible();
  const message = await notice.textContent();
  const token = await resetTokenFor("reset@example.test");
  await app.passwordReset.goto(token);
  await app.passwordReset.changePassword(newPassword);
  await expect(page).toHaveURL(/\/login\?reset=success$/);
  expect(
    (
      await request.post("/api/auth/login", {
        data: { username: "reset@example.test", password },
      })
    ).status(),
  ).toBe(401);
  await app.loginPage.login("reset@example.test", newPassword);
  await app.header.logout();

  for (const invalid of [token, "not-a-valid-token", "expired-e2e-token"]) {
    if (invalid === "expired-e2e-token") {
      insertExpiredResetToken(103, invalid);
    }
    await app.passwordReset.goto(invalid);
    await app.passwordReset.changePassword(newPassword);
    await expect(app.passwordReset.error).toBeVisible();
  }
  await app.passwordReset.goto();
  await app.passwordReset.requestReset("unknown@example.test");
  await expect(notice).toHaveText(message!);
  expect(receivedMessages()).toHaveLength(1);
});
