import * as jose from "jose";
import type { User } from "../database/schema";
const JWT_SECRET = process.env.NUXT_JWT_SECRET || "your-secret-key";

export async function verifyToken(token: string): Promise<User> {
  if (!JWT_SECRET) {
    throw new Error("JWT geheim is niet geconfigureerd");
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as User;
  } catch (err) {
    if (err instanceof jose.errors.JWTExpired) {
      const error = new Error('Token is verlopen');
      error.name = 'TokenExpiredError';
      throw error;
    }
    console.error("Token verificatie mislukt:", err);
    throw err;
  }
}
