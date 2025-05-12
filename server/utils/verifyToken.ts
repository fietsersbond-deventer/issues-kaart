import * as jose from 'jose';
import type { User } from "../database/schema";
const JWT_SECRET = process.env.NUXT_JWT_SECRET || "your-secret-key";

export async function verifyToken(token: string): Promise<User> {
  if (!JWT_SECRET) {
    throw new Error("JWT secret is not defined");
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as User;
  } catch (err) {
    console.error("Token verification failed:", err);
    throw err;
  }
}
