import type { Geometry } from "geojson";
import { booleanValid } from "@turf/boolean-valid";
import { sanitizeHtml } from "~~/server/utils/sanitizeHtml";
import { getEmitter } from "~~/server/utils/getEmitter";
import { getDb } from "~~/server/utils/db";
import {
  getTagsForIssueId,
  replaceTagsForIssue,
} from "~~/server/utils/issueTags";
import { createUniqueIssueSlug, getIssueIdFromIdentifier } from "~~/server/utils/issueSlugs";

export default defineEventHandler(async (event) => {
  requireUserSession(event);
  const eventEmitter = getEmitter();
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }
  const db = getDb();
  const issueId = getIssueIdFromIdentifier(db, id);
  if (issueId === null) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID or slug ${id} not found`,
    });
  }

  const updates: Partial<{
    title: string;
    slug: unknown;
    description: string;
    legend_id: number | null;
    geometry: Geometry;
    tags: unknown[];
  }> = await readBody(event);

  // Check if any valid fields are being updated
  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      message: "No valid fields to update",
    });
  }

  if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
    throw createError({
      statusCode: 400,
      message: "Tags must be an array",
    });
  }

  if (updates.slug !== undefined && typeof updates.slug !== "string") {
    throw createError({
      statusCode: 400,
      message: "Slug must be a string",
    });
  }

  // Sanitize HTML content if description is being updated
  if (updates.description !== undefined) {
    updates.description = sanitizeHtml(updates.description);
  }

  // Validate GeoJSON if it's being updated
  if (updates.geometry) {
    try {
      if (!booleanValid(updates.geometry)) {
        throw new Error("Invalid GeoJSON geometry");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw createError({
          statusCode: 400,
          message: `Invalid GeoJSON data: ${error.message}`,
        });
      }
      throw error;
    }
  }

  // Build the SQL update statement dynamically based on provided fields
  const updateFields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    updateFields.push(`title = ?`);
    values.push(updates.title);
  }
  if (updates.slug !== undefined) {
    updateFields.push(`slug = ?`);
    values.push("");
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = ?`);
    values.push(updates.description);
    updateFields.push(`plain_text = ?`);
    values.push(getPlainText(updates.description));
  }
  if (updates.legend_id !== undefined) {
    updateFields.push(`legend_id = ?`);
    values.push(updates.legend_id);
  }

  if (updates.geometry !== undefined) {
    updateFields.push(`geometry = ?`);
    values.push(JSON.stringify(updates.geometry));
  }

  // Add the ID as the last parameter
  values.push(issueId);

  let normalizedTags: string[] | null = null;
  let result;

  db.exec("BEGIN IMMEDIATE");
  try {
    if (updates.slug !== undefined) {
      const slugIndex = updateFields.indexOf("slug = ?");
      const currentTitle =
        updates.title ??
        (db.prepare("SELECT title FROM issues WHERE id = ?").get(issueId) as
          | { title: string }
          | undefined)?.title ??
        "";
      values[slugIndex] = createUniqueIssueSlug(
        db,
        updates.slug.trim() || currentTitle,
        issueId,
      );
    }

    if (updateFields.length > 0) {
      const updateStmt = db.prepare(
        `UPDATE issues SET ${updateFields.join(", ")} WHERE id = ?`,
      );
      result = updateStmt.run(...values);
    } else {
      const issueExists = db
        .prepare("SELECT id FROM issues WHERE id = ?")
        .get(issueId);
      result = { changes: issueExists ? 1 : 0 };
    }

    if (updates.tags !== undefined && result.changes > 0) {
      normalizedTags = replaceTagsForIssue(db, String(issueId), updates.tags);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (result.changes === 0) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${issueId} not found or not updated`,
    });
  }
  const selectStmt = db.prepare(
    "SELECT id, slug, title, description, legend_id, geometry, created_at FROM issues WHERE id = ?",
  );
  const row = selectStmt.get(issueId);
  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${issueId} not found after update`,
    });
  }
  const currentTags = normalizedTags ?? getTagsForIssueId(db, String(issueId));

  // Get user info for notification
  const user = event.context.user;
  const modifiedBy = user?.name || user?.username || "Onbekend";
  const modifiedByUserId = user?.id || 0;

  // Emit with user info
  eventEmitter.emit("issue:modified", {
    ...row,
    tags: currentTags,
    modifiedBy,
    modifiedByUserId,
  });
  return { ...row, tags: currentTags };
});
