import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";
import { parseGeojsonImport } from "~~/server/utils/geojsonImport";
import { sanitizeHtml } from "~~/server/utils/sanitizeHtml";
import { getPlainText } from "~~/server/utils/getPlainText";
import { getEmitter } from "~~/server/utils/getEmitter";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  const body = await readBody(event);
  if (
    !body ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.description !== "string" ||
    !body.description.trim() ||
    !Number.isInteger(body.legend_id) ||
    (body.titleProperty !== undefined && typeof body.titleProperty !== "string")
  ) {
    throw createError({
      statusCode: 400,
      message: "Titel, beschrijving en categorie zijn verplicht",
    });
  }
  const db = getDb();
  if (!db.prepare("SELECT id FROM legend WHERE id = ?").get(body.legend_id)) {
    throw createError({ statusCode: 400, message: "Categorie bestaat niet" });
  }
  let issues;
  try {
    issues = parseGeojsonImport(
      body.geojson,
      body.title.trim(),
      body.description.trim(),
      body.titleProperty,
    );
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : "Ongeldige GeoJSON",
    });
  }
  const insert = db.prepare(
    "INSERT INTO issues (title, description, plain_text, legend_id, geometry) VALUES (?, ?, ?, ?, ?)",
  );
  const select = db.prepare(
    "SELECT id, title, description, legend_id, geometry, created_at FROM issues WHERE id = ?",
  );
  const rows = [];
  db.exec("BEGIN");
  try {
    for (const issue of issues) {
      const description = sanitizeHtml(issue.description);
      const result = insert.run(
        issue.title,
        description,
        getPlainText(description),
        body.legend_id,
        JSON.stringify(issue.geometry),
      );
      rows.push(select.get(result.lastInsertRowid)!);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  for (const row of rows) {
    getEmitter().emit("issue:created", {
      ...row,
      tags: [],
      createdBy: event.context.user.name || event.context.user.username,
      createdByUserId: event.context.user.id,
    });
  }
  return { imported: rows.length };
});
