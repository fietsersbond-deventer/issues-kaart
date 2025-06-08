import bcrypt from "bcryptjs";
import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { testPassword } from "~~/server/utils/testPassword";

function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const { username, password, name, role = "user" } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: "Gebruikersnaam en wachtwoord zijn verplicht",
    });
  }

  const { isStrong } = testPassword(password);
  if (!isStrong) {
    throw createError({
      statusCode: 400,
      message: "Wachtwoord is niet sterk genoeg",
    });
  }

  const db = hubDatabase();
  const passwordHash = hashPassword(password);

  try {
    const user = await db
      .prepare(
        "INSERT INTO users (username, password_hash, name, role) VALUES (?1, ?2, ?3, ?4) RETURNING id, username, name, role, created_at"
      )
      .bind(username, passwordHash, name || null, role)
      .first();

    return user;
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      throw createError({
        statusCode: 409,
        message: "Username already exists",
      });
    }
    throw error;
  }
});
