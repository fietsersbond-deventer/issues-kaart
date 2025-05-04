import type { Issue } from "../../database/schema";

export default defineEventHandler(async () => {
  const issues = await hubDatabase()
    .prepare(
      "SELECT id, user_id, title, description, color, geometry, created_at FROM issues ORDER BY created_at DESC"
    )
    .all<Issue>();

  return issues;
});
