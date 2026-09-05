import { getDb } from "~~/server/utils/db";
import { normalizeTag } from "~~/server/utils/issueTags";

export default defineEventHandler((event) => {
  const db = getDb();
  const query = getQuery(event);
  const search = normalizeTag(query.q);

  const rows = search
    ? db
        .prepare(
          `SELECT DISTINCT tag
           FROM issue_tags
           WHERE tag LIKE ?
           ORDER BY tag ASC`,
        )
        .all(`%${search}%`)
    : db
        .prepare(
          `SELECT DISTINCT tag
           FROM issue_tags
           ORDER BY tag ASC`,
        )
        .all();

  return rows.map((row) => row.tag);
});