import bcrypt from "bcryptjs";
import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { testPassword } from "~~/server/utils/testPassword";
import { getDb } from "~~/server/utils/db";

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

  const db = getDb();
  const passwordHash = hashPassword(password);

  try {
    const insertStmt = db.prepare(
      "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)"
    );
    const result = insertStmt.run(username, passwordHash, name || null, role);
    const selectStmt = db.prepare(
      "SELECT id, username, name, role, created_at FROM users WHERE id = ?"
    );
    const user = selectStmt.get(result.lastInsertRowid);
    if (!user) {
      throw new Error("User not found after insert");
    }
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
