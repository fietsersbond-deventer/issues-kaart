import type { Legend } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async () => {
  const db = getDb();
  const legends = db
    .prepare(
      "SELECT id, name, description, color, created_at FROM legend ORDER BY created_at DESC"
    )
    .all() as Legend[];

  return legends;
});
