import { getDb } from "~~/server/utils/db";
import { getIssueImageUrl } from "~~/server/utils/extractImageUrl";
import { getTagsForIssueIds } from "~~/server/utils/issueTags";
import { getCommentsForIssueIds } from "~~/server/utils/comments";
import { getMatches } from "~~/app/utils/getMatch";
import { parseSearchTerms } from "~~/app/utils/parseSearchTerms";
import { getPlainText } from "~~/shared/utils/getPlainText";

// Escape LIKE wildcards so search terms are matched literally.
function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Search endpoint
 *
 */
export default defineEventHandler(async (event) => {
  const db = getDb();
  const query = getQuery(event);

  const getStringParam = (key: string, defaultValue: string): string => {
    const value = query[key];
    if (value === undefined) return defaultValue;
    if (typeof value !== "string") {
      throw createError({
        statusCode: 400,
        message: `Invalid ${key} parameter`,
      });
    }
    return value;
  };

  const parseBoundedInteger = (
    key: string,
    defaultValue: number,
    maximum: number,
  ): number => {
    const value = getStringParam(key, String(defaultValue));
    if (!/^\d+$/.test(value)) {
      throw createError({
        statusCode: 400,
        message: `Invalid ${key} parameter`,
      });
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
      throw createError({
        statusCode: 400,
        message: `Invalid ${key} parameter`,
      });
    }
    return parsed;
  };

  const orderFields: Record<string, string> = {
    id: "i.id",
    title: "i.title",
    legend_id: "i.legend_id",
    legend: "l.name",
    created_at: "i.created_at",
    updated_at: "i.updated_at",
  };
  const orderBy = `COALESCE(${orderFields.updated_at}, ${orderFields.created_at})`;
  const requestedOrder = "desc";

  const page = parseBoundedInteger("page", 1, 10_000);
  const itemsPerPage = parseBoundedInteger("itemsPerPage", 10, 100);
  const search = getStringParam("search", "");
  if (search.length > 200) {
    throw createError({ statusCode: 400, message: "Search query is too long" });
  }

  const searchTerms = parseSearchTerms(search);
  const isAuthenticated = Boolean(event.context.user);

  // A term matches title, plain_text, legend name, the label/slug/description of one of the issue's tags,
  // or (when logged in) the body of one of its comments; terms are OR-ed.
  const searchConditions = searchTerms.map(
    () =>
      `(i.title LIKE ? ESCAPE '\\' COLLATE NOCASE OR i.plain_text LIKE ? ESCAPE '\\' COLLATE NOCASE OR l.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR EXISTS (
        SELECT 1 FROM issue_tags it JOIN tags t ON t.id = it.tag_id
        WHERE it.issue_id = i.id AND (
          t.description LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR t.label LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR t.tag LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
      ))${
        isAuthenticated
          ? ` OR EXISTS (
        SELECT 1 FROM comments c
        WHERE c.issue_id = i.id AND c.deleted_at IS NULL AND c.body LIKE ? ESCAPE '\\' COLLATE NOCASE
      )`
          : ""
      }`,
  );
  const whereClause = searchConditions.length
    ? `WHERE ${searchConditions.join(" OR ")}`
    : "";
  const likeParams = searchTerms.flatMap((term) => {
    const pattern = `%${escapeLikePattern(term)}%`;
    const params = [pattern, pattern, pattern, pattern, pattern, pattern];
    if (isAuthenticated) params.push(pattern);
    return params;
  });

  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM issues i
       LEFT JOIN legend l ON l.id = i.legend_id
       ${whereClause}`,
    )
    .get(...likeParams) as { total: number };

  const offset = (page - 1) * itemsPerPage;
  const sqlStatement = `SELECT i.id, i.slug, i.title, i.description, i.plain_text, i.legend_id, i.created_at, i.updated_at,
      l.name AS legend_name${
        isAuthenticated
          ? `,
      (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id AND c.deleted_at IS NULL) AS comment_count`
          : ""
      }
     FROM issues i
     LEFT JOIN legend l ON l.id = i.legend_id
     ${whereClause}
     ORDER BY ${orderBy} ${requestedOrder}
     LIMIT ? OFFSET ?
     `;
  const rows = db
    .prepare(sqlStatement)
    .all(...likeParams, itemsPerPage, offset);

  const tagsByIssueId = getTagsForIssueIds(
    db,
    rows.map((row) => row.id as number),
  );
  const commentBodiesByIssueId = isAuthenticated
    ? getCommentsForIssueIds(
        db,
        rows.map((row) => row.id as number),
      )
    : new Map<number, string[]>();

  const items = rows.map((issue) => {
    const { description, plain_text, legend_name, ...issueFields } = issue;
    const plainTextDescription =
      typeof plain_text === "string" ? plain_text : "";
    const commentSnippets = (
      commentBodiesByIssueId.get(issue.id as number) ?? []
    ).flatMap((body) =>
      searchTerms.flatMap((term) =>
        getMatches(getPlainText(body), term, 5).map((text) => ({
          text,
          source: "comment" as const,
        })),
      ),
    );

    const result: Record<string, unknown> = {
      ...issueFields,
      tags: tagsByIssueId.get(issue.id as number) ?? [],
      snippets: [
        ...searchTerms.flatMap((term) =>
          getMatches(plainTextDescription, term, 5).map((text) => ({
            text,
            source: "description" as const,
          })),
        ),
        ...commentSnippets,
      ],
    };

    // Add imageUrl if requested (returns URL path, not actual data)
    if (typeof description === "string") {
      result.imageUrl = getIssueImageUrl(issue.id as number, description);
    }

    return result;
  });

  return {
    items,
    total: countRow.total,
  };
});
