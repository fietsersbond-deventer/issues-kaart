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
  
  // Get the issue title before deletion
  const issue = db.prepare("SELECT title FROM issues WHERE id = ?").get(id) as { title: string } | undefined;
  if (!issue) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  const result = db.prepare("DELETE FROM issues WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }
  
  // Emit with user info
  const user = event.context.user;
  const deletedBy = user?.name || user?.username || "Onbekend";
  const deletedByUserId = user?.id || 0;
  emitter.emit("issue:deleted", {
    id: Number(id),
    title: issue.title,
    deletedBy,
    deletedByUserId,
  });
  return { id };
});
