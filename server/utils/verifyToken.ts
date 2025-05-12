import jwt from "jsonwebtoken";
import type { User } from "../database/schema";
const JWT_SECRET = process.env.NUXT_JWT_SECRET || "your-secret-key";

export async function verifyToken(token: string): Promise<User> {
  if (!JWT_SECRET) {
    throw new Error("JWT secret is not defined");
  }
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("Token verification failed:", err);
        return reject(err);
      }
      resolve(decoded as User);
    });
  });
}
