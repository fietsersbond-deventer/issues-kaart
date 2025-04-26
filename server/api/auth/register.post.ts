import bcrypt from "bcrypt";

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: "Username and password are required",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { results } = await hubDatabase()
      .prepare(
        "INSERT INTO users (username, password_hash) VALUES (?1, ?2) RETURNING id, username, created_at"
      )
      .bind(username, passwordHash)
      .all();
    return results[0];
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
