export default defineEventHandler(async (event) => {
  requireUserSession(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const result = await hubDatabase()
    .prepare("DELETE FROM issues WHERE id = ?1 RETURNING id")
    .bind(id)
    .first<{ id: string }>();

  if (!result) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  return result;
});
