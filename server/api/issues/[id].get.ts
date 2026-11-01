// import type { Issue } from "../../database/schema";
import { getDb } from "~~/server/utils/db";
import { getIssueImageUrl } from "~~/server/utils/extractImageUrl";
import { getTagsForIssueId } from "~~/server/utils/issueTags";
import { getIssueIdFromIdentifier } from "~~/server/utils/issueSlugs";

type IssueRow = {
  id: number;
  title: string;
  description: string;
  legend_id: number;
  geometry: string;
  created_at: string;
  slug: string;
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const db = getDb();
  const issueId = getIssueIdFromIdentifier(db, id);
  if (issueId === null) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID or slug ${id} not found`,
    });
  }
  const row = db
    .prepare(
      `SELECT i.id, i.slug, i.title, i.description, i.legend_id,
     i.geometry, i.created_at 
     FROM issues i 
     WHERE i.id = ?`,
    )
    .get(issueId) as IssueRow | undefined;
  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  // Check if there's an image in the description
  const description =
    typeof row.description === "string" ? row.description : null;
  const imageUrl = getIssueImageUrl(row.id, description);
  const tags = getTagsForIssueId(db, row.id);

  return {
    ...row,
    geometry:
      typeof row.geometry === "string" ? JSON.parse(row.geometry) : null,
    imageUrl,
    tags,
  };
});
