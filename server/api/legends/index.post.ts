import { requireUserSession } from "~~/server/utils/requireUserSession";
import type { Legend } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";
import { sanitizeDescriptionHtml } from "~~/shared/utils/sanitizeDescriptionHtml";
import { toLegendType } from "~~/server/utils/typeConversions";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const { name, description, color, icon, icon_data_url } = await readBody<
    Partial<Legend>
  >(event);

  if (!name || !color) {
    throw createError({
      statusCode: 400,
      message: "Name and color are required",
    });
  }

  const db = getDb();
  const insertStmt = db.prepare(
    "INSERT INTO legend (name, description, color, icon, icon_data_url) VALUES (?, ?, ?, ?, ?)"
  );
  const result = insertStmt.run(
    name,
    description?.trim() ? sanitizeDescriptionHtml(description) : null,
    color,
    icon || null,
    icon_data_url || null
  );
  const selectStmt = db.prepare(
    "SELECT id, name, description, color, icon, icon_data_url, created_at FROM legend WHERE id = ?"
  );
  const row = selectStmt.get(result.lastInsertRowid);
  if (!row) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch created legend item",
    });
  }
  return toLegendType(row as any);
});
