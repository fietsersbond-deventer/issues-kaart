import type { Geometry } from "geojson";
import type { Issue } from "../../database/schema";
import { booleanValid } from "@turf/boolean-valid";

export default defineEventHandler(async (event) => {
  requireUserSession(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const updates: Partial<{
    title: string;
    description: string;
    legend_id: number | null;
    geometry: Geometry;
  }> = await readBody(event);

  // Check if any valid fields are being updated
  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      message: "No valid fields to update",
    });
  }

  // Validate GeoJSON if it's being updated
  if (updates.geometry) {
    try {
      if (!booleanValid(updates.geometry)) {
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
  }

  // Build the SQL update statement dynamically based on provided fields
  const updateFields: string[] = [];
  const values: (string | number | null)[] = [];
  let paramCounter = 1;

  if (updates.title !== undefined) {
    updateFields.push(`title = ?${paramCounter}`);
    values.push(updates.title);
    paramCounter++;
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = ?${paramCounter}`);
    values.push(updates.description);
    paramCounter++;
  }
  if (updates.legend_id !== undefined) {
    updateFields.push(`legend_id = ?${paramCounter}`);
    values.push(updates.legend_id);
    paramCounter++;
  }

  if (updates.geometry !== undefined) {
    updateFields.push(`geometry = ?${paramCounter}`);
    values.push(JSON.stringify(updates.geometry));
    paramCounter++;
  }

  // Add the ID as the last parameter
  values.push(id);

  const updateQuery = `
    UPDATE issues 
    SET ${updateFields.join(", ")} 
    WHERE id = ?${paramCounter} 
    RETURNING id, title, description, legend_id, geometry, created_at
  `;

  const issue = await hubDatabase()
    .prepare(updateQuery)
    .bind(...values)
    .first<Issue>();

  if (!issue) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  return issue;
});
