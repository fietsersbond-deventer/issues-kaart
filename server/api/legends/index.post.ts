import { requireUserSession } from "~~/server/utils/requireUserSession";
import type { Legend } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const { name, description, color } = await readBody<Partial<Legend>>(event);

  if (!name || !color) {
    throw createError({
      statusCode: 400,
      message: "Name and color are required",
    });
  }

  const db = getDb();
  const legend = db
    .prepare(
      "INSERT INTO legend (name, description, color) VALUES (?, ?, ?) RETURNING id, name, description, color, created_at"
    )
    .get(name, description || null, color) as Legend | undefined;

  if (!legend) {
    throw createError({
      statusCode: 500,
      message: "Failed to create legend item",
    });
  }

  return legend;
});
