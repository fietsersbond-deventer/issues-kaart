import type { Geometry } from "geojson";
import type { Issue } from "../../database/schema";
import { booleanValid } from "@turf/boolean-valid";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

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
      "UPDATE issues SET title = ?1, description = ?2, color = ?3, geometry = ?4 WHERE id = ?5 RETURNING id, title, description, color, geometry, created_at"
    )
    .bind(title, description, color || "#2196F3", JSON.stringify(geometry), id)
    .first<Issue>();

  if (!issue) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  return issue;
});
