import { randomBytes } from "crypto";
import { getDb } from "~~/server/utils/db";

const APP_URL = process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000";

function generateToken() {
  return randomBytes(32).toString("hex");
}

export default defineEventHandler(async (event) => {
  const { sendMail } = useNodeMailer();

  const { email } = await readBody(event);

  if (!email) {
    throw createError({
      statusCode: 400,
      message: "Email is required",
    });
  }

  const db = getDb();

  // Find user by email
  const user = db
    .prepare("SELECT id, username, name FROM users WHERE username = ?")
    .get(email);

  // If no user found, return success to prevent email enumeration
  if (!user) {
    return { success: true };
  }

  // Generate reset token
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // Token expires in 24 hours

  // Remove old reset tokens for this user before storing the new one
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(
    user.id,
  );

  // Store reset token
  db.prepare(
    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
  ).run(user.id, token, expiresAt.toISOString());

  await sendMail({
    subject: "Wachtwoord opnieuw instellen",
    to: email,
    html: `
<!DOCTYPE html>
<body>
    <h2>Wachtwoord opnieuw instellen</h2>
    <p>Hallo ${user.name},</p>
    <p>Klik op onderstaande link om een nieuw wachtwoord in te stellen:</p>
    
    <a href="${APP_URL}/reset-password/${token}" class="button">Nieuw wachtwoord instellen</a>
    
    <p>Deze link is één dag geldig.</p>
    
    <p>Als je dit niet hebt aangevraagd, kun je deze e-mail veilig negeren.</p>
    
    <div class="footer">
        <p>Met vriendelijke groet,<br>
        Het Fietsersbond team</p>
    </div>
</body>
</html>`,
    text: `Hallo ${user.name},

Gebruik de onderstaande link om een nieuw wachtwoord in te stellen:

${APP_URL}/reset-password/${token}

Deze link is één dag geldig.

Als je dit niet hebt aangevraagd, kun je deze e-mail veilig negeren.
`,
  });

  return { success: true };
});
