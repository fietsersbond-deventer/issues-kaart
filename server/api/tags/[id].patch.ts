import { getDb } from "~~/server/utils/db";
import { normalizeTag } from "~~/server/utils/issueTags";
import { requireUserSession } from "~~/server/utils/requireUserSession";
import { sanitizeDescriptionHtml } from "~~/shared/utils/sanitizeDescriptionHtml";
import { toTagType } from "~~/server/utils/typeConversions";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const idParam = getRouterParam(event, "id");
  const tagId = Number(idParam);
  if (!Number.isInteger(tagId) || tagId <= 0) {
    throw createError({ statusCode: 400, message: "Invalid tag ID" });
  }

  const body = await readBody<{
    label?: string | null;
    description?: string | null;
    icon?: string | null;
    tag?: string;
  }>(event);

  const db = getDb();
  
  // Get the existing tag by ID
  const existingTag = db
    .prepare("SELECT id, tag, label, description, icon FROM tags WHERE id = ?")
    .get(tagId) as
    | { id: number; tag: string; label: string | null; description: string | null; icon: string | null }
    | undefined;

  if (!existingTag) {
    throw createError({ statusCode: 404, message: "Tag not found" });
  }

  const cleanLabel =
    body.label === undefined
      ? existingTag.label
      : body.label === null
        ? null
        : body.label.trim() || existingTag.tag;
  const cleanDescription =
    body.description === undefined
      ? existingTag.description
      : body.description === null
        ? null
        : body.description.trim()
          ? sanitizeDescriptionHtml(body.description.trim())
          : null;
  const cleanIcon =
    body.icon === undefined ? existingTag.icon : body.icon?.trim() || null;

  // If tag slug is being changed, update it
  if (body.tag !== undefined) {
    const nextTag = normalizeTag(body.tag);
    if (!nextTag) {
      throw createError({ statusCode: 400, message: "Invalid tag slug" });
    }
    
    if (nextTag !== existingTag.tag) {
      // Check if the new tag already exists
      const existing = db
        .prepare("SELECT id FROM tags WHERE tag = ?")
        .get(nextTag) as { id: number } | undefined;
      
      if (existing) {
        throw createError({ statusCode: 409, message: "Tag slug already exists" });
      }

      // Update the tag slug
      db.prepare("UPDATE tags SET tag = ? WHERE id = ?").run(nextTag, existingTag.id);
    }
  }

  // Update metadata
  db.prepare(
    `UPDATE tags SET label = ?, description = ?, icon = ? WHERE id = ?`,
  ).run(cleanLabel, cleanDescription, cleanIcon, existingTag.id);

  const row = db
    .prepare("SELECT id, tag, label, description, icon FROM tags WHERE id = ?")
    .get(existingTag.id) as
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
      message: "Failed to fetch updated tag",
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
