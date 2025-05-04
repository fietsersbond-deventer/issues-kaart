import type { Geometry } from "geojson";
import type { Issue } from "../../database/schema";
import { booleanValid } from "@turf/boolean-valid";

export default defineEventHandler(async (event) => {
  const {
    title,
    description,
    color,
    geometry,
  }: { title: string; description: string; color: string; geometry: Geometry } =
    await readBody(event);

  if (!title || !description || !geometry) {
    throw createError({
      statusCode: 400,
      message: "Title, description and geometry are required",
    });
  }

  // Validate GeoJSON
  try {
    if (!booleanValid(geometry)) {
      throw new Error("Invalid GeoJSON geometry");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw createError({
        statusCode: 400,
        message: `Invalid GeoJSON data: ${error.message}`,
      });
    }
    throw error;
  }

  // Get authenticated user from context (set by auth middleware)
  const user = event.context.user;

  const issue = await hubDatabase()
    .prepare(
      "INSERT INTO issues (user_id, title, description, color, geometry) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id, user_id, title, description, color, geometry, created_at"
    )
    .bind(user.id, title, description, color || "#2196F3", geometry)
    .first<Issue>();

  if (!issue) {
    throw createError({
      statusCode: 500,
      message: "Failed to create issue: No result returned",
    });
  }

  return issue;
});
