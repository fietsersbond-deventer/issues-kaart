import type { TextEntry, TextType } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";
import { requireUserSession } from "~~/server/utils/requireUserSession";
import { validateHTML } from "~~/server/utils/validateHTML";

type UpdateTextBody = {
  text?: unknown;
};

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const key = getRouterParam(event, "key");
  if (!key) {
    throw createError({ statusCode: 400, message: "Text key is required" });
  }

  const body = await readBody<UpdateTextBody>(event);
  if (typeof body.text !== "string") {
    throw createError({ statusCode: 400, message: "Text must be a string" });
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT text_type FROM text WHERE key = ?")
    .get(key) as Pick<TextEntry, "text_type"> | undefined;
  if (!existing) {
    throw createError({ statusCode: 404, message: "Text entry not found" });
  }

  let text: string;
  try {
    text = validateHTML(body.text, existing.text_type as TextType);
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : "Invalid text value",
    });
  }
  const result = db
    .prepare(
      `UPDATE text
      SET text = ?, updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ?
      WHERE key = ?`,
    )
    .run(text, event.context.user.id, key);

  if (result.changes === 0) {
    throw createError({ statusCode: 404, message: "Text entry not found" });
  }

  return db
    .prepare("SELECT key, text, text_type FROM text WHERE key = ?")
    .get(key) as Pick<TextEntry, "key" | "text" | "text_type">;
});
