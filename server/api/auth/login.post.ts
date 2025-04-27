import bcrypt from "bcryptjs";
import type { User } from "~~/server/database/schema";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NUXT_JWT_SECRET || "your-secret-key";

export default defineEventHandler(async (event) => {
  const db = hubDatabase();

  const { username, password } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: "Username and password are required",
    });
  }

  const user: User | null = await db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .bind(username)
    .first();

  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Invalid credentials",
    });
  }

  console.log("Attempting login for username:", username);
  console.log("Retrieved password hash:", user.password_hash);

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  console.log("Password comparison result:", isValidPassword);

  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: "Invalid credentials",
    });
  }

  // Create session
  const session = jwt.sign(
    {
      id: user.id,
      username: user.username,
    },
    JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return {
    user: {
      id: user.id,
      username: user.username,
    },
    token: session,
  };
});
