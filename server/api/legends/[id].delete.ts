import { requireUserSession } from "~~/server/utils/requireUserSession";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Legend ID is required",
    });
  }

  // Check if the legend is being used by any issues
  const usageCheck = await hubDatabase()
    .prepare("SELECT COUNT(*) as count FROM issues WHERE legend_id = ?")
    .bind(id)
    .first<{ count: number }>();

  if (usageCheck && usageCheck.count > 0) {
    throw createError({
      statusCode: 400,
      message: "Cannot delete legend item that is in use by issues",
    });
  }

  const result = await hubDatabase()
    .prepare("DELETE FROM legend WHERE id = ?")
    .bind(id)
    .run();

  if (!result) {
    throw createError({
      statusCode: 404,
      message: `Legend item with ID ${id} not found`,
    });
  }

  return { success: true };
});
