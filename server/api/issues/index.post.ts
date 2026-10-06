import type { Geometry } from "geojson";
import { booleanValid } from "@turf/boolean-valid";
import { sanitizeHtml } from "~~/server/utils/sanitizeHtml";
import { getPlainText } from "~~/server/utils/getPlainText";
import { getEmitter } from "~~/server/utils/getEmitter";
import { getDb } from "~~/server/utils/db";
import { replaceTagsForIssue } from "~~/server/utils/issueTags";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const eventEmitter = getEmitter();
  const {
    title,
    description,
    legend_id,
    geometry,
    tags,
  }: {
    title: string;
    description: string;
    legend_id: number;
    geometry: Geometry;
    tags?: unknown;
  } = await readBody(event);

  if (!title || !description || !geometry) {
    throw createError({
      statusCode: 400,
      message: "Title, description and geometry are required",
    });
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    throw createError({
      statusCode: 400,
      message: "Tags must be an array",
    });
  }

  // Sanitize HTML content
  const sanitizedDescription = sanitizeHtml(description);

  // Validate GeoJSON
  try {
    if (!booleanValid(geometry)) {
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

  const db = getDb();
  const insertStmt = db.prepare(
    "INSERT INTO issues (title, description, plain_text, legend_id, geometry) VALUES (?, ?, ?, ?, ?)",
  );
  let result;
  let normalizedTags: string[];
  db.exec("BEGIN");
  try {
    result = insertStmt.run(
      title,
      sanitizedDescription,
      getPlainText(sanitizedDescription),
      legend_id,
      JSON.stringify(geometry),
    );
    normalizedTags = replaceTagsForIssue(
      db,
      result.lastInsertRowid.toString(),
      tags ?? [],
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const selectStmt = db.prepare(
    "SELECT id, title, description, legend_id, geometry, created_at FROM issues WHERE id = ?",
  );
  const row = selectStmt.get(result.lastInsertRowid);
  if (!row) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch created issue",
    });
  }

  // Get user info for notification
  const user = event.context.user;
  const createdBy = user?.name || user?.username || "Onbekend";
  const createdByUserId = user?.id || 0;

  // Emit with user info
  eventEmitter.emit("issue:created", {
    ...row,
    tags: normalizedTags,
    createdBy,
    createdByUserId,
  });
  return { ...row, tags: normalizedTags };
});
