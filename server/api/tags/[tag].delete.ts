import { getDb } from "~~/server/utils/db";
import { normalizeTag } from "~~/server/utils/issueTags";
import { requireAdminSession } from "~~/server/utils/requireUserSession";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const tagParam = getRouterParam(event, "tag");
  const normalizedTag = normalizeTag(tagParam ?? "");
  if (!normalizedTag) {
    throw createError({ statusCode: 400, message: "Tag is required" });
  }

  const db = getDb();
  const result = db
    .prepare("DELETE FROM tags WHERE tag = ?")
    .run(normalizedTag);

  if (result.changes === 0) {
    throw createError({ statusCode: 404, message: "Tag not found" });
  }

  db.prepare("DELETE FROM issue_tags WHERE tag = ?").run(normalizedTag);

  return { success: true };
});
