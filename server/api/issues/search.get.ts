import { getDb } from "~~/server/utils/db";
import { extractImageUrl } from "~~/server/utils/extractImageUrl";
import { getMatch } from "~~/app/utils/getMatch";
import { parseSearchTerms } from "~~/app/utils/parseSearchTerms";
import sanitizeHtml from "sanitize-html";

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
  };
  const requestedOrderBy = getStringParam("orderBy", "created_at");
  const orderBy = orderFields[requestedOrderBy];
  if (!orderBy) {
    throw createError({
      statusCode: 400,
      message: "Invalid orderBy parameter",
    });
  }

  const requestedOrder = getStringParam("order", "asc").toLowerCase();
  if (requestedOrder !== "asc" && requestedOrder !== "desc") {
    throw createError({ statusCode: 400, message: "Invalid order parameter" });
  }

  const page = parseBoundedInteger("page", 1, 10_000);
  const itemsPerPage = parseBoundedInteger("itemsPerPage", 10, 100);
  const search = getStringParam("search", "");
  if (search.length > 200) {
    throw createError({ statusCode: 400, message: "Search query is too long" });
  }

  const searchTerms = parseSearchTerms(search);
  const sqlStatement = `SELECT i.id, i.title, i.description, i.legend_id, i.created_at,
      l.name AS legend_name
     FROM issues i
     LEFT JOIN legend l ON l.id = i.legend_id
     ORDER BY ${orderBy} ${requestedOrder}
     `;
  const rows = db.prepare(sqlStatement).all();

  // Process results
  const matchingItems = rows.flatMap((issue) => {
    const { description, legend_name, ...issueFields } = issue;
    const plainTextDescription =
      typeof description === "string"
        ? sanitizeHtml(description, {
            allowedTags: [],
            allowedAttributes: {},
            textFilter: (text) => `${text} `,
          }).trim()
        : "";
    const matchesSearch =
      searchTerms.length === 0 ||
      searchTerms.some((term) => {
        const normalizedTerm = term.toLowerCase();
        return [issue.title, plainTextDescription, legend_name].some(
          (value) =>
            typeof value === "string" &&
            value.toLowerCase().includes(normalizedTerm),
        );
      });
    if (!matchesSearch) return [];

    const result: Record<string, unknown> = {
      ...issueFields,
      snippets: searchTerms
        .map((term) => getMatch(plainTextDescription, term, 5))
        .filter((snippet): snippet is string => Boolean(snippet)),
    };

    // Add imageUrl if requested (returns URL path, not actual data)
    if (typeof description === "string") {
      // Check if issue has an image in description
      const hasImage = extractImageUrl(description) !== null;
      result.imageUrl = hasImage ? `/api/issues/${issue.id}/image` : null;
    }

    return [result];
  });

  const offset = (page - 1) * itemsPerPage;
  return {
    items: matchingItems.slice(offset, offset + itemsPerPage),
    total: matchingItems.length,
  };
});
