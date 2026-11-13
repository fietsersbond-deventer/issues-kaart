import { expect, type APIRequestContext } from "@playwright/test";
import { password } from "../seed.js";

export async function apiHeaders(
  request: APIRequestContext,
  username = "user@example.test",
) {
  const response = await request.post("/api/auth/login", {
    data: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const result: { token: string } = await response.json();
  return { Authorization: `Bearer ${result.token}` };
}
