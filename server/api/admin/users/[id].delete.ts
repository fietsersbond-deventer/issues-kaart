import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const id = event.context.params?.id;

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  const db = getDb();

  try {
    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    return { success: true };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Failed to delete user",
    });
  }
});
