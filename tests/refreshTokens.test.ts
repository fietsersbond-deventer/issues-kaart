import { beforeEach, describe, expect, it } from "vitest";

process.env.NUXT_DB_PATH = ":memory:";

const { getDb } = await import("../server/utils/db");
const {
  generateRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
} = await import("../server/utils/tokenUtils");

const db = getDb();

function count() {
  return (
    db.prepare("SELECT COUNT(*) AS c FROM refresh_tokens").get() as {
      c: number;
    }
  ).c;
}

describe("refresh tokens", () => {
  beforeEach(() => {
    db.exec(`
      DROP TABLE IF EXISTS refresh_tokens;
      DROP TABLE IF EXISTS users;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'user'
      );
      CREATE TABLE refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users (id, username, name, role) VALUES (1, 'jan', 'Jan', 'admin');
    `);
  });

  it("removes expired tokens when a new token is generated", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    db.prepare(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (1, 'old', ?)"
    ).run(past);

    const token = generateRefreshToken(1);

    expect(count()).toBe(1);
    expect(verifyRefreshToken(token).id).toBe(1);
  });

  it("rejects expired tokens", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    db.prepare(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (1, 'old', ?)"
    ).run(past);

    expect(() => verifyRefreshToken("old")).toThrow();
  });

  it("rotates a token: old one is revoked, new one is valid", () => {
    const token = generateRefreshToken(1);

    const { user, refreshToken } = rotateRefreshToken(token);

    expect(user.username).toBe("jan");
    expect(refreshToken).not.toBe(token);
    expect(() => verifyRefreshToken(token)).toThrow();
    expect(verifyRefreshToken(refreshToken).id).toBe(1);
    expect(count()).toBe(1);
  });

  it("does not rotate twice with the same token", () => {
    const token = generateRefreshToken(1);
    rotateRefreshToken(token);

    expect(() => rotateRefreshToken(token)).toThrow();
    expect(count()).toBe(1);
  });

  it("rolls back when rotation fails", () => {
    const token = generateRefreshToken(1);
    db.exec(
      "CREATE TRIGGER fail_insert BEFORE INSERT ON refresh_tokens BEGIN SELECT RAISE(ABORT, 'boom'); END"
    );

    expect(() => rotateRefreshToken(token)).toThrow();
    db.exec("DROP TRIGGER fail_insert");

    expect(verifyRefreshToken(token).id).toBe(1);
    expect(count()).toBe(1);
  });
});
