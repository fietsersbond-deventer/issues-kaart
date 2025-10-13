import * as jose from "jose";
import { randomBytes } from "crypto";
import type { User } from "../database/schema";
import { getDb } from "./db";

const JWT_SECRET = process.env.NUXT_JWT_SECRET || "your-secret-key";
// const REFRESH_TOKEN_EXPIRY = "30d"; // 30 days
const ACCESS_TOKEN_EXPIRY = "4h"; // 4 hours

export function generateAccessToken(
  user: Omit<User, "password_hash" | "created_at">
) {
  if (!JWT_SECRET) {
    throw new Error("JWT geheim is niet geconfigureerd");
  }

  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
}

export function generateRefreshToken(userId: number): string {
  const token = randomBytes(40).toString("hex");
  const db = getDb();

  // Set expiry date to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  db.prepare(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(userId, token, expiresAt.toISOString());

  return token;
}

export function verifyRefreshToken(token: string) {
  const db = getDb();

  // Get refresh token and associated user
  const result = db
    .prepare(
      `SELECT rt.*, u.* FROM refresh_tokens rt 
     JOIN users u ON u.id = rt.user_id 
     WHERE rt.token = ? AND rt.expires_at > datetime('now')`
    )
    .get(token);

  if (!result) {
    throw new Error("Ongeldige of verlopen refresh token");
  }

  const user: Omit<User, "password_hash" | "created_at"> = {
    id: typeof result.user_id === "number" ? result.user_id : 0,
    username:
      typeof result.username === "string"
        ? result.username
        : String(result.username ?? ""),
    name: typeof result.name === "string" ? result.name : null,
    role:
      typeof result.role === "string"
        ? result.role
        : String(result.role ?? "user"),
  };

  return user;
}

export function revokeRefreshToken(token: string) {
  const db = getDb();
  db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(token);
}

export function revokeAllUserRefreshTokens(userId: number) {
  const db = getDb();
  db.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(userId);
}
