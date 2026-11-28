import { getDb } from "~~/server/utils/db";
import { getIssueImageUrl } from "~~/server/utils/extractImageUrl";
import { getTagsForIssueIds } from "~~/server/utils/issueTags";
import { requireUserSession } from "~~/server/utils/requireUserSession";
import type { PrintIssue } from "~~/shared/types/Issue";

const MAX_IDS = 1000;
const EXCERPT_LENGTH = 100;

/** The start of a text, cut at a word when possible. */
function toExcerpt(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= EXCERPT_LENGTH) return clean;
  const cut = clean.slice(0, EXCERPT_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

type PrintIssueRow = {
  id: number;
  slug: string;
  title: string;
  description: string;
  plain_text: string;
  legend_id: number;
  geometry: string;
  updated_at: string;
};

/**
 * Data for printing a selection of issues: ?ids=1,2,3.
 * Returned most recently changed first, as in the list.
 */
export default defineEventHandler(async (event): Promise<PrintIssue[]> => {
  requireUserSession(event);
  const { ids: idsParam } = getQuery(event);
  if (typeof idsParam !== "string" || !/^\d+(,\d+)*$/.test(idsParam)) {
    throw createError({ statusCode: 400, message: "Invalid ids parameter" });
  }
  const ids = [...new Set(idsParam.split(",").map(Number))];
  if (ids.length > MAX_IDS) {
    throw createError({ statusCode: 400, message: "Too many ids" });
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.id, i.slug, i.title, i.description, i.plain_text, i.legend_id, i.geometry,
         COALESCE(i.updated_at, i.created_at) AS updated_at
       FROM issues i
       WHERE i.id IN (${ids.map(() => "?").join(", ")})
       ORDER BY COALESCE(i.updated_at, i.created_at) DESC, i.id DESC`,
    )
    .all(...ids) as PrintIssueRow[];

  const tagsByIssueId = getTagsForIssueIds(
    db,
    rows.map((row) => row.id),
  );

  return rows.map(({ description, plain_text, geometry, ...issue }) => ({
    ...issue,
    excerpt: toExcerpt(plain_text),
    geometry: JSON.parse(geometry),
    tags: tagsByIssueId.get(issue.id) ?? [],
    imageUrl: getIssueImageUrl(issue.id, description),
  }));
});
