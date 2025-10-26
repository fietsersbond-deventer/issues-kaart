import { getDb } from "~~/server/utils/db";
import type { Legend } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Legend ID is required",
    });
  }

  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, name, description, color, icon, icon_data_url, created_at FROM legend WHERE id = ?"
    )
    .get(id);

  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Legend with ID ${id} not found`,
    });
  }

  return row as unknown as Legend;
});
