import { getDb } from "~~/server/utils/db";
import { requireUserSession } from "~~/server/utils/requireUserSession";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const idParam = getRouterParam(event, "id");
  const tagId = Number(idParam);
  if (!Number.isInteger(tagId) || tagId <= 0) {
    throw createError({ statusCode: 400, message: "Invalid tag ID" });
  }

  const db = getDb();
  
  // Check if tag exists
  const tag = db
    .prepare("SELECT id FROM tags WHERE id = ?")
    .get(tagId) as { id: number } | undefined;

  if (!tag) {
    throw createError({ statusCode: 404, message: "Tag not found" });
  }

  db.prepare("DELETE FROM issue_tags WHERE tag_id = ?").run(tagId);
  db.prepare("DELETE FROM tags WHERE id = ?").run(tagId);

  return { success: true };
});
