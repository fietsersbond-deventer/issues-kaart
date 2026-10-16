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

  // Ruim verlopen tokens op
  db.prepare(
    "DELETE FROM refresh_tokens WHERE julianday(expires_at) <= julianday('now')"
  ).run();

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
     WHERE rt.token = ? AND julianday(rt.expires_at) > julianday('now')`
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

// Verifieert, trekt het oude token in en geeft een nieuw token uit in één transactie
export function rotateRefreshToken(token: string) {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const user = verifyRefreshToken(token);
    revokeRefreshToken(token);
    const refreshToken = generateRefreshToken(user.id);
    db.exec("COMMIT");
    return { user, refreshToken };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function revokeRefreshToken(token: string) {
  const db = getDb();
  db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(token);
}

export function revokeAllUserRefreshTokens(userId: number) {
  const db = getDb();
  db.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(userId);
}
