import type { Issue } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const issue = await hubDatabase()
    .prepare(
      `SELECT i.id, i.title, i.description, i.color, i.legend_id, 
       l.name as legend_name, l.color as color,
       i.geometry, i.created_at 
       FROM issues i 
       LEFT JOIN legend l ON i.legend_id = l.id 
       WHERE i.id = ?1`
    )
    .bind(id)
    .first<Issue & { legend_name?: string; legend_color?: string }>();

  if (!issue) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  return {
    ...issue,
    geometry: JSON.parse(issue.geometry),
  } as Issue;
});
