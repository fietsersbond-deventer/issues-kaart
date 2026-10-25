import { requireUserSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";
import { getCommentById, updateComment } from "~~/server/utils/comments";
import { getEmitter } from "~~/server/utils/getEmitter";

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
  const existing = getCommentById(db, id, { raw: true });

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: `Comment with ID ${id} not found`,
    });
  }

  if (existing.deleted_at) {
    throw createError({
      statusCode: 400,
      message: "Cannot edit a deleted comment",
    });
  }

  const user = event.context.user;
  const isAuthor = user && existing.author_id === user.id;
  const isAdmin = user && user.role === "admin";

  if (!isAuthor && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  const body = await readBody<{ body: string }>(event);
  const updated = updateComment(db, id, { body: body?.body });

  const modifiedBy = user?.name || user?.username || "Onbekend";
  const modifiedByUserId = user?.id ?? 0;

  getEmitter().emit("comment:modified", {
    ...updated,
    modifiedBy,
    modifiedByUserId,
  });

  return updated;
});
