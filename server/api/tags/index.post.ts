import { getDb } from "~~/server/utils/db";
import { normalizeTag, setTagMetadata } from "~~/server/utils/issueTags";
import { requireAdminSession } from "~~/server/utils/requireUserSession";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

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
    label: body.label,
    description: body.description,
    icon: body.icon,
  });

  const row = db
    .prepare("SELECT tag, label, description, icon FROM tags WHERE tag = ?")
    .get(tag) as
    | {
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

  return {
    tag: row.tag,
    label: row.label ?? row.tag,
    description: row.description ?? null,
    icon: row.icon ?? null,
  };
});
