import type { Issue } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const { results: issues } = await hubDatabase()
    .prepare(
      `SELECT i.id, i.title, i.description, i.color, i.legend_id,
       l.name as legend_name, l.color as color,
       i.geometry, i.created_at 
       FROM issues i 
       LEFT JOIN legend l ON i.legend_id = l.id 
       ORDER BY i.created_at DESC`
    )
    .all<Issue & { legend_name?: string; color?: string }>();

  return issues.map(
    (issue) =>
      ({
        ...issue,
        geometry: JSON.parse(issue.geometry),
      } as Issue)
  );
  // return issues.map((issue) => ({,
});
