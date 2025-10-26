import type { Legend } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(() => {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, description, color, icon, created_at FROM legend ORDER BY created_at DESC"
    )
    .all();
  return rows as unknown as Legend[];
});
