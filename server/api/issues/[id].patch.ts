import type { Geometry } from "geojson";
import { booleanValid } from "@turf/boolean-valid";
import { sanitizeHtml } from "~~/server/utils/sanitizeHtml";
import { getEmitter } from "~~/server/utils/getEmitter";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireUserSession(event);
  const eventEmitter = getEmitter();
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

  // Sanitize HTML content if description is being updated
  if (updates.description !== undefined) {
    updates.description = sanitizeHtml(updates.description);
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

  if (updates.title !== undefined) {
    updateFields.push(`title = ?`);
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = ?`);
    values.push(updates.description);
  }
  if (updates.legend_id !== undefined) {
    updateFields.push(`legend_id = ?`);
    values.push(updates.legend_id);
  }

  if (updates.geometry !== undefined) {
    updateFields.push(`geometry = ?`);
    values.push(JSON.stringify(updates.geometry));
  }

  // Add the ID as the last parameter
  values.push(id);

  const db = getDb();
  const updateStmt = db.prepare(
    `UPDATE issues SET ${updateFields.join(", ")} WHERE id = ?`
  );
  const result = updateStmt.run(...values);
  if (result.changes === 0) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found or not updated`,
    });
  }
  const selectStmt = db.prepare(
    "SELECT id, title, description, legend_id, geometry, created_at FROM issues WHERE id = ?"
  );
  const row = selectStmt.get(id);
  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found after update`,
    });
  }
  
  // Get user info for notification
  const user = event.context.user;
  const modifiedBy = user?.name || user?.username || "Onbekend";
  const modifiedByUserId = user?.id || 0;
  
  // Emit with user info
  eventEmitter.emit("issue:modified", { 
    ...row, 
    modifiedBy,
    modifiedByUserId,
  });
  return row;
});
