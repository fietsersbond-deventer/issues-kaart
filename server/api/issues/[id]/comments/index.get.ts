import { requireUserSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";
import { getCommentsForIssue } from "~~/server/utils/comments";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const issueId = Number(getRouterParam(event, "id"));
  if (isNaN(issueId)) {
    throw createError({
      statusCode: 400,
      message: "Invalid issue ID",
    });
  }

  const db = getDb();
  const issueExists = db
    .prepare("SELECT id FROM issues WHERE id = ?")
    .get(issueId);

  if (!issueExists) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${issueId} not found`,
    });
  }

  return getCommentsForIssue(db, issueId);
});
