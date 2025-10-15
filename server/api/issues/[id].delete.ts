import { getEmitter } from "~~/server/utils/getEmitter";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const emitter = getEmitter();
  requireUserSession(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const db = getDb();
  const result = db.prepare("DELETE FROM issues WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }
  emitter.emit("issue:deleted", Number(id));
  return { id };
});
