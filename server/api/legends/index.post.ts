import { requireUserSession } from "~~/server/utils/requireUserSession";
import type { Legend } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const { name, description, color } = await readBody<Partial<Legend>>(event);

  if (!name || !color) {
    throw createError({
      statusCode: 400,
      message: "Name and color are required",
    });
  }

  const db = getDb();
  const insertStmt = db.prepare(
    "INSERT INTO legend (name, description, color) VALUES (?, ?, ?)"
  );
  const result = insertStmt.run(name, description || null, color);
  const selectStmt = db.prepare(
    "SELECT id, name, description, color, created_at FROM legend WHERE id = ?"
  );
  const row = selectStmt.get(result.lastInsertRowid);
  if (!row) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch created legend item",
    });
  }
  return row as unknown as Legend;
});
