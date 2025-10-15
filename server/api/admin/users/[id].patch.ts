import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const id = event.context.params?.id;
  const { username, name, role } = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Username is required",
    });
  }

  const db = getDb();
  try {
    const updateResult = db
      .prepare("UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?")
      .run(username, name || null, role, id);
    if (updateResult.changes === 0) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }
    const user = db
      .prepare(
        "SELECT id, username, name, role, created_at FROM users WHERE id = ?"
      )
      .get(id);
    if (!user) {
      throw new Error("User not found after update");
    }
    return user;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message &&
      error.message.includes("unique constraint")
    ) {
      throw createError({
        statusCode: 409,
        message: "Username already exists",
      });
    }
    throw error;
  }
});
