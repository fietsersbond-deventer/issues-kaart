import { requireUserSession } from "~~/server/utils/requireUserSession";
import type { Legend } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const { name, description, color } = await readBody<Partial<Legend>>(event);

  if (!name || !color) {
    throw createError({
      statusCode: 400,
      message: "Name and color are required",
    });
  }

  const legend = await hubDatabase()
    .prepare(
      "INSERT INTO legend (name, description, color) VALUES (?1, ?2, ?3) RETURNING id, name, description, color, created_at"
    )
    .bind(name, description || null, color)
    .first<Legend>();

  if (!legend) {
    throw createError({
      statusCode: 500,
      message: "Failed to create legend item",
    });
  }

  return legend;
});
