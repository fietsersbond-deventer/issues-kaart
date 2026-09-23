import type { TextEntry } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(() => {
  const db = getDb();
  const rows = db
    .prepare("SELECT key, text, text_type FROM text ORDER BY key ASC")
    .all();

  return rows as unknown as Pick<TextEntry, "key" | "text" | "text_type">[];
});
