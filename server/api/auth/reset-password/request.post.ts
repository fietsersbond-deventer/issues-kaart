import { randomBytes } from "crypto";
import * as postmark from "postmark";

const POSTMARK_API_KEY = process.env.NUXT_POSTMARK_API_KEY;
const APP_URL = process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.NUXT_EMAIL_FROM;
if (!EMAIL_FROM) {
  throw new Error("NUXT_EMAIL_FROM environment variable is required");
}

if (!POSTMARK_API_KEY) {
  throw new Error("NUXT_POSTMARK_API_KEY environment variable is required");
}

const postmarkClient = new postmark.ServerClient(POSTMARK_API_KEY);

function generateToken() {
  return randomBytes(32).toString("hex");
}

export default defineEventHandler(async (event) => {
  const { email } = await readBody(event);

  if (!email) {
    throw createError({
      statusCode: 400,
      message: "Email is required",
    });
  }

  const db = hubDatabase();

  // Find user by email
  const user = await db
    .prepare("SELECT id, username FROM users WHERE username = ?")
    .bind(email)
    .first();

  // If no user found, return success to prevent email enumeration
  if (!user) {
    return { success: true };
  }

  // Generate reset token
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // Token expires in 24 hours

  // Store reset token
  await db
    .prepare(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?1, ?2, ?3)"
    )
    .bind(user.id, token, expiresAt.toISOString())
    .run();

  // Send email using Postmark template
  await postmarkClient.sendEmailWithTemplate({
    From: EMAIL_FROM,
    To: email,
    TemplateAlias: "password-reset",
    TemplateModel: {
      username: user.username,
      resetLink: `${APP_URL}/reset-password/${token}`,
    },
  });

  return { success: true };
});
