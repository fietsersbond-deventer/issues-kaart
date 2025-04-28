import type { Geometry } from "geojson";
import type { Issue } from "../../database/schema";
import { booleanValid } from "@turf/boolean-valid";

export default defineEventHandler(async (event) => {
  const { description, geometry }: { description: string; geometry: Geometry } =
    await readBody(event);

  if (!description || !geometry) {
    throw createError({
      statusCode: 400,
      message: "Description and geometry are required",
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
      "INSERT INTO issues (user_id, description, geometry) VALUES (?1, ?2, ?3) RETURNING id, user_id, description, geometry, created_at"
    )
    .bind(user.id, description, geometry)
    .first<Issue>();

  if (!issue) {
    throw createError({
      statusCode: 500,
      message: "Failed to create issue: No result returned",
    });
  }

  return issue;
});
