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
  let paramCounter = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = ?${paramCounter}`);
    values.push(updates.name);
    paramCounter++;
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = ?${paramCounter}`);
    values.push(updates.description);
    paramCounter++;
  }
  if (updates.color !== undefined) {
    updateFields.push(`color = ?${paramCounter}`);
    values.push(updates.color);
    paramCounter++;
  }

  // Add the ID as the last parameter
  values.push(id);

  const db = getDb();
  const legend = db
    .prepare(
      `UPDATE legend SET ${updateFields.join(
        ", "
      )} WHERE id = ?${paramCounter} RETURNING id, name, description, color, created_at`
    )
    .get(...values) as Legend | undefined;

  if (!legend) {
    throw createError({
      statusCode: 404,
      message: `Legend item with ID ${id} not found`,
    });
  }

  return legend;
});
