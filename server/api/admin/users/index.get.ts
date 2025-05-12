export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const db = hubDatabase();
  const { results: users } = await db
    .prepare(
      "SELECT id, username, created_at FROM users ORDER BY created_at DESC"
    )
    .all();

  return users;
});
