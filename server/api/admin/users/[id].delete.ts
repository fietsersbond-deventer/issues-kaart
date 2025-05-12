export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const id = event.context.params?.id;

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  const db = hubDatabase();

  try {
    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

    return { success: true };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Failed to delete user",
    });
  }
});
