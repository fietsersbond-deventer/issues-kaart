import { getDb } from "~~/server/utils/db";
import { getIssueImageUrl } from "~~/server/utils/extractImageUrl";
import { getTagsForIssueIds, normalizeTag } from "~~/server/utils/issueTags";
import { getCommentsForIssueIds } from "~~/server/utils/comments";
import { escapeLikePattern } from "~~/server/utils/escapeLikePattern";
import { getMatches } from "~~/app/utils/getMatch";
import { parseSearchTerms } from "~~/app/utils/parseSearchTerms";
import { getPlainText } from "~~/shared/utils/getPlainText";

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

  // ?cat=1,2 limits results to any of these categories (same format as the map)
  const categoryParam = getStringParam("cat", "");
  const categoryIds = categoryParam
    .split(",")
    .filter(Boolean)
    .map((id) => {
      if (!/^\d+$/.test(id)) {
        throw createError({
          statusCode: 400,
          message: "Invalid cat parameter",
        });
      }
      return Number(id);
    });

  // ?tag=a+b limits results to issues having all these tags (same as the map)
  const tags = [
    ...new Set(
      getStringParam("tag", "")
        .split(/[+,\s]/)
        .map(normalizeTag)
        .filter((tag): tag is string => Boolean(tag)),
    ),
  ];

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
  const likeParams = searchTerms.flatMap((term) => {
    const pattern = `%${escapeLikePattern(term)}%`;
    const params = [pattern, pattern, pattern, pattern, pattern, pattern];
    if (isAuthenticated) params.push(pattern);
    return params;
  });

  const conditions: string[] = [];
  const whereParams: (string | number)[] = [];
  if (searchConditions.length) {
    conditions.push(`(${searchConditions.join(" OR ")})`);
    whereParams.push(...likeParams);
  }
  if (categoryIds.length) {
    conditions.push(
      `i.legend_id IN (${categoryIds.map(() => "?").join(", ")})`,
    );
    whereParams.push(...categoryIds);
  }
  for (const tag of tags) {
    conditions.push(`EXISTS (
        SELECT 1 FROM issue_tags it JOIN tags t ON t.id = it.tag_id
        WHERE it.issue_id = i.id AND t.tag = ?
      )`);
    whereParams.push(tag);
  }
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  // The id tiebreaker keeps the order, and thus the pages, stable.
  const orderClause = `ORDER BY ${orderBy} ${requestedOrder}, i.id DESC`;

  // ?idsOnly=1 returns the ids of all matches, without paging, so a list
  // selection can include every result (see the print selection).
  if (getStringParam("idsOnly", "") === "1") {
    const idRows = db
      .prepare(
        `SELECT i.id
         FROM issues i
         LEFT JOIN legend l ON l.id = i.legend_id
         ${whereClause}
         ${orderClause}`,
      )
      .all(...whereParams) as { id: number }[];
    return { ids: idRows.map((row) => row.id) };
  }

  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM issues i
       LEFT JOIN legend l ON l.id = i.legend_id
       ${whereClause}`,
    )
    .get(...whereParams) as { total: number };

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
     ${orderClause}
     LIMIT ? OFFSET ?
     `;
  const rows = db
    .prepare(sqlStatement)
    .all(...whereParams, itemsPerPage, offset);

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
