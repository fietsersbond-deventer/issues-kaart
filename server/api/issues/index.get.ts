import type { Issue } from "../../database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (_event) => {
  const db = getDb();
  const issues = db
    .prepare(
      `SELECT i.id, i.title, i.description, i.legend_id,
     l.name as legend_name, l.color,
     i.geometry, i.created_at 
     FROM issues i 
     LEFT JOIN legend l ON i.legend_id = l.id 
     ORDER BY i.created_at DESC`
    )
    .all() as Array<Issue & { legend_name?: string; color?: string }>;

  return issues.map(
    (issue) =>
      ({
        ...issue,
        geometry: JSON.parse(issue.geometry),
      } as Issue)
  );
});
