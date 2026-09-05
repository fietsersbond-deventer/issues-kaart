import { getDb } from "~~/server/utils/db";
import { normalizeTag, setTagMetadata } from "~~/server/utils/issueTags";
import { requireAdminSession } from "~~/server/utils/requireUserSession";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const tagParam = getRouterParam(event, "tag");
  const normalizedTag = normalizeTag(tagParam ?? "");
  if (!normalizedTag) {
    throw createError({ statusCode: 400, message: "Tag is required" });
  }

  const body = await readBody<{
    label?: string | null;
    description?: string | null;
    icon?: string | null;
    tag?: string;
  }>(event);

  const db = getDb();
  const nextTag = normalizeTag(body.tag ?? normalizedTag) ?? normalizedTag;
  const updatedTag = setTagMetadata(db, nextTag, {
    label: body.label,
    description: body.description,
    icon: body.icon,
  });

  if (!updatedTag) {
    throw createError({ statusCode: 400, message: "Unable to update tag" });
  }

  const row = db
    .prepare("SELECT tag, label, description, icon FROM tags WHERE tag = ?")
    .get(updatedTag) as
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
      message: "Failed to fetch updated tag",
    });
  }

  return {
    tag: row.tag,
    label: row.label ?? row.tag,
    description: row.description ?? null,
    icon: row.icon ?? null,
  };
});
