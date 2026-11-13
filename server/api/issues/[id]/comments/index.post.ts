import { requireUserSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";
import { createComment } from "~~/server/utils/comments";
import { getEmitter } from "~~/server/utils/getEmitter";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const issueId = Number(getRouterParam(event, "id"));
  if (isNaN(issueId)) {
    throw createError({
      statusCode: 400,
      message: "Invalid issue ID",
    });
  }

  const body = await readBody<{ body: string }>(event);
  const db = getDb();
  const user = event.context.user;

  const comment = createComment(db, {
    issue_id: issueId,
    author_id: user?.id ?? null,
    body: body?.body,
  });

  const createdBy = user?.name || user?.username || "Onbekend";
  const createdByUserId = user?.id ?? 0;

  getEmitter().emit("comment:created", {
    ...comment,
    createdBy,
    createdByUserId,
  });

  return comment;
});
