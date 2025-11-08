/**
 * Admin issues search endpoint
 * Supports server-side pagination, sorting, and filtering (title + description)
 * Returns search context snippet instead of full description
 */

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const search = query.search as string | undefined;
  const page = parseInt(query.page as string) || 1;
  const itemsPerPage = parseInt(query.itemsPerPage as string) || 10;
  const sortBy = query.sortBy as string | undefined;
  const sortOrder = (query.sortOrder as string) || "desc";

  const db = getDb();

  /**
   * Remove data URLs from text to avoid matching on image data
   */
  function cleanTextForSearch(text: string): string {
    // Remove data:image/* and other data URLs
    return text.replace(/data:[a-zA-Z0-9/;,=+]+/g, "");
  }

  /**
   * Create a snippet showing context around the search match
   */
  function createSnippet(
    text: string | undefined,
    searchTerm: string | undefined,
    contextLength: number = 40
  ): string | undefined {
    if (!text || !searchTerm) return undefined;

    // Clean the text for searching (remove data URLs)
    const cleanedText = cleanTextForSearch(text);
    const lowerText = cleanedText.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerSearch);

    if (index === -1) return undefined;

    // Find the match in the original text to show correct context
    const start = Math.max(0, index - contextLength);
    const end = Math.min(
      cleanedText.length,
      index + searchTerm.length + contextLength
    );

    let snippet = cleanedText.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < cleanedText.length) snippet = snippet + "...";

    return snippet;
  }

  // Build the WHERE clause for search
  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (search) {
    // Search in title, description (filtered for data URLs), and legend name
    whereClause += ` AND (
      LOWER(issues.title) LIKE LOWER(?) 
      OR LOWER(issues.description) LIKE LOWER(?)
      OR LOWER(legend.name) LIKE LOWER(?)
    )`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Count total filtered results (with JOIN for search)
  const countStmt = db.prepare(
    `SELECT COUNT(*) as total FROM issues 
     LEFT JOIN legend ON issues.legend_id = legend.id
     ${whereClause}`
  );
  const countResult = countStmt.get(...params) as { total: number };
  const total = countResult.total;

  // Build ORDER BY clause
  const orderByColumn =
    sortBy === "legend_name"
      ? "legend.name"
      : sortBy
      ? `issues.${sortBy}`
      : "issues.created_at";
  const orderClause = `ORDER BY ${orderByColumn} ${sortOrder.toUpperCase()}`;

  // Calculate offset
  const offset = (page - 1) * itemsPerPage;

  // Fetch the issues with their legend info
  const selectStmt = db.prepare(`
    SELECT 
      issues.id,
      issues.title,
      issues.description,
      issues.legend_id,
      issues.created_at,
      legend.name as legend_name,
      legend.color as legend_color
    FROM issues
    LEFT JOIN legend ON issues.legend_id = legend.id
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `);

  const rows = selectStmt.all(...params, itemsPerPage, offset) as Array<{
    id: number;
    title: string;
    description: string;
    legend_id: number | null;
    created_at: string;
    legend_name: string | null;
    legend_color: string | null;
  }>;

  // Format the response - create snippet instead of returning full description
  // Filter out false positives where match was only on data URLs
  const items = rows
    .map((row) => {
      const snippet = createSnippet(row.description, search);
      return {
        id: row.id,
        title: row.title,
        snippet,
        legend_id: row.legend_id,
        created_at: row.created_at,
      };
    })
    .filter(
      (item) =>
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.snippet !== undefined
    );

  return {
    items,
    total,
    page,
    itemsPerPage,
  };
});
