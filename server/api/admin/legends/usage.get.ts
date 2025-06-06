import type { Legend } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  // Make sure only admins can access usage information
  requireUserSession(event);

  const { results } = await hubDatabase()
    .prepare(`
      SELECT 
        l.id, 
        COUNT(i.id) as usage_count,
        json_group_array(
          CASE 
            WHEN i.id IS NOT NULL 
            THEN json_object('id', i.id, 'title', i.title)
            ELSE NULL 
          END
        ) as used_by_issues
      FROM legend l
      LEFT JOIN issues i ON i.legend_id = l.id
      GROUP BY l.id
    `)
    .all<{ id: number; usage_count: number; used_by_issues: string }>();

  // Transform the results to parse the JSON array and filter out null entries
  return results.reduce((acc, { id, usage_count, used_by_issues }) => {
    acc[id] = {
      usage_count,
      used_by_issues: usage_count > 0 
        ? JSON.parse(used_by_issues).filter(Boolean)
        : []
    };
    return acc;
  }, {} as Record<number, { 
    usage_count: number; 
    used_by_issues: Array<{ id: number; title: string }> 
  }>);
});
