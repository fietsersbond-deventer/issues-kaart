import type { Issue } from "../../database/schema";

export default defineEventHandler(async () => {
  const { results: issues } = await hubDatabase()
    .prepare(
      "SELECT id, title, description, color, geometry, created_at FROM issues ORDER BY created_at DESC"
    )
    .all<Issue>();

  return issues.map(
    (issue) =>
      ({
        ...issue,
        geometry: JSON.parse(issue.geometry),
      } as Issue)
  );
  // return issues.map((issue) => ({,
});
