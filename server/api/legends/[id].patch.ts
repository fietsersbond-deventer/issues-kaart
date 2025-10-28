import { requireUserSession } from "~~/server/utils/requireUserSession";
import type { Legend } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Legend ID is required",
    });
  }

  const updates = await readBody<Partial<Legend>>(event);

  // Check if any valid fields are being updated
  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      message: "No valid fields to update",
    });
  }

  // Build the SQL update statement dynamically based on provided fields
  const updateFields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.name !== undefined) {
    updateFields.push(`name = ?`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = ?`);
    values.push(updates.description);
  }
  if (updates.color !== undefined) {
    updateFields.push(`color = ?`);
    values.push(updates.color);
  }
  updateFields.push(`icon = ?`);
  if (updates.icon !== undefined) {
    values.push(updates.icon);
  } else {
    values.push(null);
  }
  updateFields.push(`icon_data_url = ?`);
  if (updates.icon_data_url !== undefined) {
    values.push(updates.icon_data_url);
  } else {
    values.push(null);
  }

  // Add the ID as the last parameter
  values.push(id);

  const db = getDb();
  const updateStmt = db.prepare(
    `UPDATE legend SET ${updateFields.join(", ")} WHERE id = ?`
  );
  const result = updateStmt.run(...values);
  if (result.changes === 0) {
    throw createError({
      statusCode: 404,
      message: `Legend item with ID ${id} not found or not updated`,
    });
  }
  const selectStmt = db.prepare(
    "SELECT id, name, description, color, icon, icon_data_url, created_at FROM legend WHERE id = ?"
  );
  const row = selectStmt.get(id);
  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Legend item with ID ${id} not found after update`,
    });
  }
  return row as unknown as Legend;
});
