import type { Issue } from "../../database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const db = getDb();
  const issue = db
    .prepare(
      `SELECT i.id, i.title, i.description, i.legend_id, 
     l.name as legend_name, l.color,
     i.geometry, i.created_at 
     FROM issues i 
     LEFT JOIN legend l ON i.legend_id = l.id 
     WHERE i.id = ?`
    )
    .get(id) as (Issue & { legend_name?: string; color?: string }) | undefined;

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
