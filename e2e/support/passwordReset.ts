import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { runtime } from "./runtime.js";

export function receivedMessages(): string[] {
  const contents = readFileSync(runtime().mailFile, "utf8").trim();
  return contents
    ? contents.split("\n").map((line): string => JSON.parse(line))
    : [];
}

export async function resetTokenFor(email: string) {
  await expect
    .poll(() => receivedMessages().some((message) => message.includes(email)))
    .toBe(true);
  const mail = receivedMessages().find((message) => message.includes(email))!;
  const link = mail
    .replace(/=\r\n/g, "")
    .match(/http:\/\/127\.0\.0\.1:3100\/reset-password\/([a-f0-9]{64})/);
  expect(link).not.toBeNull();
  return link![1]!;
}

export function insertExpiredResetToken(userId: number, token: string) {
  const db = new DatabaseSync(runtime().dbPath);
  try {
    db.prepare(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    ).run(userId, token, "2000-01-01T00:00:00.000Z");
  } finally {
    db.close();
  }
}
