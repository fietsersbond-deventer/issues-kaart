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
   * Create a snippet showing context around the search match
   */
  function createSnippet(
    text: string | undefined,
    searchTerm: string | undefined,
    contextLength: number = 40
  ): string | undefined {
    if (!text || !searchTerm) return undefined;

    const lowerText = text.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerSearch);

    if (index === -1) return undefined;

    const start = Math.max(0, index - contextLength);
    const end = Math.min(
      text.length,
      index + searchTerm.length + contextLength
    );

    let snippet = text.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";

    return snippet;
  }

  // Build the WHERE clause for search
  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (search) {
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
  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    snippet: createSnippet(row.description, search),
    legend_id: row.legend_id,
    created_at: row.created_at,
  }));

  return {
    items,
    total,
    page,
    itemsPerPage,
  };
});
