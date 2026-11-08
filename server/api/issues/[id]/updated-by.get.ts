import { getDb } from "~~/server/utils/db";
import { getIssueIdFromIdentifier } from "~~/server/utils/issueSlugs";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const identifier = getRouterParam(event, "id");
  if (!identifier) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const db = getDb();
  const issueId = getIssueIdFromIdentifier(db, identifier);
  if (issueId === null) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID or slug ${identifier} not found`,
    });
  }

  const row = db
    .prepare(
      `SELECT COALESCE(NULLIF(users.name, ''), users.username) AS updated_by_name,
        issues.updated_at
       FROM issues
       LEFT JOIN users ON users.id = issues.updated_by_user_id
       WHERE issues.id = ?`,
    )
    .get(issueId) as {
      updated_by_name: string | null;
      updated_at: string | null;
    } | undefined;

  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${identifier} not found`,
    });
  }

  return row;
});
