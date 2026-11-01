import { getDb } from "~~/server/utils/db";
import { normalizeTag } from "~~/server/utils/issueTags";

export default defineEventHandler((event) => {
  const db = getDb();
  const query = getQuery(event);
  const search = normalizeTag(query.q);

  const rows = search
    ? db
        .prepare(
          `SELECT id, tag, label, description, icon
           FROM tags
           WHERE tag LIKE ?
           ORDER BY tag ASC`,
        )
        .all(`%${search}%`)
    : db
        .prepare(
          `SELECT id, tag, label, description, icon
           FROM tags
           ORDER BY tag ASC`,
        )
        .all();

  return rows.map((row) => ({
    id: Number(row.id),
    tag: String(row.tag),
    label: row.label ?? String(row.tag),
    description: row.description ?? null,
    icon: row.icon ?? null,
  }));
});
