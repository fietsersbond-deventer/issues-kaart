import { requireUserSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";
import { getCommentById } from "~~/server/utils/comments";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const id = Number(getRouterParam(event, "id"));
  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: "Invalid comment ID",
    });
  }

  const db = getDb();
  const comment = getCommentById(db, id);

  if (!comment) {
    throw createError({
      statusCode: 404,
      message: `Comment with ID ${id} not found`,
    });
  }

  return comment;
});
