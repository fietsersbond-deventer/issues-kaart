// import type { Issue } from "../../database/schema";
import { getDb } from "~~/server/utils/db";
import { extractImageUrl } from "~~/server/utils/extractImageUrl";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.id, i.title, i.description, i.legend_id, 
     i.geometry, i.created_at 
     FROM issues i 
     WHERE i.id = ?`
    )
    .get(id);
  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  // Check if there's an image in the description
  const description =
    typeof row.description === "string" ? row.description : null;
  const hasImage = extractImageUrl(description) !== null;
  const imageUrl = hasImage ? `/api/issues/${row.id}/image` : null;

  return {
    ...row,
    geometry:
      typeof row.geometry === "string" ? JSON.parse(row.geometry) : null,
    imageUrl,
  };
});
