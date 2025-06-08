import bcrypt from "bcryptjs";
import { testPassword } from "~~/server/utils/testPassword";

function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export default defineEventHandler(async (event) => {
  const { token, password } = await readBody(event);

  if (!token || !password) {
    throw createError({
      statusCode: 400,
      message: "Token and password are required",
    });
  }

  const { isStrong } = testPassword(password);

  if (!isStrong) {
    throw createError({
      statusCode: 400,
      message: "Wachtwoord is niet sterk genoeg",
    });
  }

  const db = hubDatabase();

  // Get reset token and associated user
  const resetToken = await db
    .prepare(
      "SELECT prt.*, u.id as user_id FROM password_reset_tokens prt " +
        "JOIN users u ON u.id = prt.user_id " +
        "WHERE prt.token = ? AND prt.expires_at > datetime('now')"
    )
    .bind(token)
    .first();

  if (!resetToken) {
    throw createError({
      statusCode: 400,
      message: "Invalid or expired token",
    });
  }

  const passwordHash = hashPassword(password);

  // Update password and delete used token
  await db.batch([
    db
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(passwordHash, resetToken.user_id),
    db.prepare("DELETE FROM password_reset_tokens WHERE token = ?").bind(token),
  ]);

  return { success: true };
});
