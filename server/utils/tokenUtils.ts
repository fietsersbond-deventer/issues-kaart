import * as jose from "jose";
import { randomBytes } from "crypto";
import type { User } from "../database/schema";

const JWT_SECRET = process.env.NUXT_JWT_SECRET || "your-secret-key";
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes

export async function generateAccessToken(user: Omit<User, 'password_hash' | 'created_at'>) {
  if (!JWT_SECRET) {
    throw new Error("JWT geheim is niet geconfigureerd");
  }

  const secret = new TextEncoder().encode(JWT_SECRET);
  return await new jose.SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
}

export async function generateRefreshToken(userId: number): Promise<string> {
  const token = randomBytes(40).toString('hex');
  const db = hubDatabase();
  
  // Set expiry date to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db
    .prepare(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?1, ?2, ?3)"
    )
    .bind(userId, token, expiresAt.toISOString())
    .run();

  return token;
}

export async function verifyRefreshToken(token: string) {
  const db = hubDatabase();
  
  // Get refresh token and associated user
  const result = await db
    .prepare(
      `SELECT rt.*, u.* FROM refresh_tokens rt 
       JOIN users u ON u.id = rt.user_id 
       WHERE rt.token = ?1 AND rt.expires_at > datetime('now')`
    )
    .bind(token)
    .first<any>();

  if (!result) {
    throw new Error('Ongeldige of verlopen refresh token');
  }

  const user: Omit<User, 'password_hash' | 'created_at'> = {
    id: result.user_id,
    username: result.username,
    name: result.name,
    role: result.role,
  };

  return user;
}

export async function revokeRefreshToken(token: string) {
  const db = hubDatabase();
  await db
    .prepare("DELETE FROM refresh_tokens WHERE token = ?")
    .bind(token)
    .run();
}

export async function revokeAllUserRefreshTokens(userId: number) {
  const db = hubDatabase();
  await db
    .prepare("DELETE FROM refresh_tokens WHERE user_id = ?")
    .bind(userId)
    .run();
}
