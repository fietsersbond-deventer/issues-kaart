import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler((event) => {
  requireAdminSession(event);

  const id = event.context.params?.id;

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  const db = getDb();
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw createError({
      statusCode: 500,
      message: "Failed to delete user",
    });
  }
  return { success: true };
});
