import { requireAdminSession } from "~~/server/utils/requireUserSession";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const db = hubDatabase();
  const { results: users } = await db
    .prepare(
      "SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC"
    )
    .all();

  return users;
});
