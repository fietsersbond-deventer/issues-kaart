import { getDb } from "~~/server/utils/db";
import { normalizeTag, setTagMetadata } from "~~/server/utils/issueTags";
import { requireUserSession } from "~~/server/utils/requireUserSession";
import { sanitizeDescriptionHtml } from "~~/shared/utils/sanitizeDescriptionHtml";
import { toTagType } from "~~/server/utils/typeConversions";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const body = await readBody<{
    tag?: string;
    label?: string | null;
    description?: string | null;
    icon?: string | null;
  }>(event);

  const normalizedTag = normalizeTag(body.tag);
  if (!normalizedTag) {
    throw createError({ statusCode: 400, message: "Tag is required" });
  }

  const db = getDb();
  const tag = setTagMetadata(db, normalizedTag, {
    label: body.label === undefined ? normalizedTag : body.label?.trim() || null,
    description: body.description?.trim()
      ? sanitizeDescriptionHtml(body.description.trim())
      : null,
    icon: body.icon ?? null,
  });

  const row = db
    .prepare("SELECT id, tag, label, description, icon FROM tags WHERE tag = ?")
    .get(tag) as
    | {
        id: number;
        tag: string;
        label: string | null;
        description: string | null;
        icon: string | null;
      }
    | undefined;

  if (!row) {
    throw createError({
      statusCode: 500,
      message: "Failed to create tag metadata",
    });
  }

  return toTagType({
    id: row.id,
    tag: row.tag,
    label: row.label ?? row.tag,
    description: row.description ?? null,
    icon: row.icon ?? null,
  });
});
