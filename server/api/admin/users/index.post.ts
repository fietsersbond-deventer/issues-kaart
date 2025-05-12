import bcrypt from "bcryptjs";

function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: "Username and password are required",
    });
  }

  const db = hubDatabase();
  const passwordHash = hashPassword(password);

  try {
    const user = await db
      .prepare(
        "INSERT INTO users (username, password_hash) VALUES (?1, ?2) RETURNING id, username, created_at"
      )
      .bind(username, passwordHash)
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
