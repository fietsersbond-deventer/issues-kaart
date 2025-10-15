import bcrypt from "bcryptjs";
import type { User } from "~~/server/database/schema";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/tokenUtils";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const db = getDb();
  const { username, password } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: "Gebruikersnaam en wachtwoord zijn verplicht",
    });
  }

  const user = db
    .prepare(
      "SELECT id, username, name, role, password_hash FROM users WHERE username = ?"
    )
    .get(username);

  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Ongeldige inloggegevens",
    });
  }

  const isValidPassword =
    typeof user.password_hash === "string"
      ? await bcrypt.compare(password, user.password_hash)
      : false;

  if (!isValidPassword) {
    console.log("Invalid password for username:", username);
    throw createError({
      statusCode: 401,
      message: "Ongeldige inloggegevens",
    });
  }

  try {
    // Create access token and refresh token
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user as Omit<User, "created_at" | "password_hash">),
      generateRefreshToken(user.id as number),
    ]);

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      token: accessToken,
      refreshToken: refreshToken,
    };
  } catch (error) {
    console.error("Error creating JWT:", error);
    throw createError({
      statusCode: 500,
      message: (error as Error).message || "Interne serverfout",
    });
  }
});
