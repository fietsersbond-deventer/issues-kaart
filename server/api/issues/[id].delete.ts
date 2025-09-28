import { getEmitter } from "~~/server/utils/getEmitter";

export default defineEventHandler(async (event) => {
  const emitter = getEmitter();

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

  emitter.emit("issue:deleted", Number(id));

  return result;
});
