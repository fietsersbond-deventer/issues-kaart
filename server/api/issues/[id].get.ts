// import type { Issue } from "../../database/schema";
import { getDb } from "~~/server/utils/db";
import { extractImageUrl } from "~~/server/utils/extractImageUrl";

export default defineCachedEventHandler(async (event) => {
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
     l.name as legend_name, l.color,
     i.geometry, i.created_at 
     FROM issues i 
     LEFT JOIN legend l ON i.legend_id = l.id 
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
