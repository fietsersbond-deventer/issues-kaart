import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const db = getDb();
  const users = db
    .prepare(
      `
    SELECT 
      u.id, 
      u.username, 
      u.name, 
      u.role, 
      u.created_at,
      prt.token as reset_token,
      prt.expires_at as reset_token_expires_at
    FROM users u
    LEFT JOIN password_reset_tokens prt ON u.id = prt.user_id
      AND prt.expires_at > datetime('now')
    ORDER BY u.created_at DESC
  `
    )
    .all();

  return users;
});
