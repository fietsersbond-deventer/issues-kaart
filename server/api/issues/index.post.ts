import type { Geometry } from "geojson";
import { booleanValid } from "@turf/boolean-valid";
import { sanitizeHtml } from "~~/server/utils/sanitizeHtml";
import { getEmitter } from "~~/server/utils/getEmitter";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const eventEmitter = getEmitter();
  const {
    title,
    description,
    legend_id,
    geometry,
  }: {
    title: string;
    description: string;
    legend_id: number;
    geometry: Geometry;
  } = await readBody(event);

  if (!title || !description || !geometry) {
    throw createError({
      statusCode: 400,
      message: "Title, description and geometry are required",
    });
  }

  // Sanitize HTML content
  const sanitizedDescription = sanitizeHtml(description);

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

  const db = getDb();
  const issue = db
    .prepare(
      "INSERT INTO issues (title, description, legend_id, geometry) VALUES (?, ?, ?, ?) RETURNING id, title, description, legend_id, geometry, created_at"
    )
    .get(title, sanitizedDescription, legend_id, JSON.stringify(geometry)) as
    | {
        id: number;
        title: string;
        description: string;
        legend_id: number;
        geometry: string;
        created_at: string;
      }
    | undefined;

  if (!issue) {
    throw createError({
      statusCode: 500,
      message: "Failed to create issue: No result returned",
    });
  }

  eventEmitter.emit("issue:created", issue);

  return issue;
});
