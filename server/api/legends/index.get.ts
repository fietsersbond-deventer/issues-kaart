import type { Legend } from "~~/server/database/schema";

export default defineEventHandler(async () => {
  const { results: legends } = await hubDatabase()
    .prepare(
      "SELECT id, name, description, color, created_at FROM legend ORDER BY created_at DESC"
    )
    .all<Legend>();

  return legends;
});
