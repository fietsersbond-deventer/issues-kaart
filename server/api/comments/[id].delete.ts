import { requireUserSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";
import { getCommentById, deleteComment } from "~~/server/utils/comments";
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

  const user = event.context.user;
  const isAuthor = user && existing.author_id === user.id;
  const isAdmin = user && user.role === "admin";

  if (!isAuthor && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  const query = getQuery(event);
  const isHard = query.hard === "true" && isAdmin;

  deleteComment(db, id, { soft: !isHard });

  const deletedBy = user?.name || user?.username || "Onbekend";
  const deletedByUserId = user?.id ?? 0;

  getEmitter().emit("comment:deleted", {
    id,
    issue_id: existing.issue_id,
    deletedBy,
    deletedByUserId,
    soft: !isHard,
  });

  return { id, deleted: true, soft: !isHard };
});
