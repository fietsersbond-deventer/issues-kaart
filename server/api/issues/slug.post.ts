import { getDb } from "~~/server/utils/db";
import { createUniqueIssueSlug } from "~~/server/utils/issueSlugs";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const { slug, issueId }: { slug?: unknown; issueId?: unknown } =
    await readBody(event);

  if (typeof slug !== "string") {
    throw createError({
      statusCode: 400,
      message: "Slug must be a string",
    });
  }

  if (
    issueId !== undefined &&
    (typeof issueId !== "number" ||
      !Number.isSafeInteger(issueId) ||
      issueId < 1)
  ) {
    throw createError({
      statusCode: 400,
      message: "Issue ID must be a positive integer",
    });
  }

  return {
    slug: createUniqueIssueSlug(getDb(), slug, issueId),
  };
});
