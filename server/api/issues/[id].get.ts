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
      "SELECT id, title, description, color, geometry, created_at FROM issues WHERE id = ?1"
    )
    .bind(id)
    .first<Issue>();

  if (!issue) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  return issue;
});
