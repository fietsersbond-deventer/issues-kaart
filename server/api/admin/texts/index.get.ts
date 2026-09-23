import { requireUserSession } from "~~/server/utils/requireUserSession";
import type { TextEntry } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

type AdminTextEntry = TextEntry & {
  updated_by_name: string | null;
};

export default defineEventHandler((event) => {
  requireUserSession(event);

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT text.key, text.text, text.text_type, text.updated_by_user_id,
        text.created_at, text.updated_at,
        COALESCE(users.name, users.username) AS updated_by_name
      FROM text
      LEFT JOIN users ON users.id = text.updated_by_user_id
      ORDER BY text.key ASC`,
    )
    .all();

  return rows as unknown as AdminTextEntry[];
});