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

  const issue = await hubDatabase()
    .prepare(
      "INSERT INTO issues (title, description, color, geometry) VALUES (?1, ?2, ?3, ?4) RETURNING id, title, description, color, geometry, created_at"
    )
    .bind(title, description, color || "#2196F3", JSON.stringify(geometry))
    .first();

  console.log("Inserted issue:", issue);

  if (!issue) {
    throw createError({
      statusCode: 500,
      message: "Failed to create issue: No result returned",
    });
  }

  return issue;
});
