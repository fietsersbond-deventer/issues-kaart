import type { CategoryMapping } from "~~/shared/types/GeojsonImport";
import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";
import { prepareGeojsonImport } from "~~/server/utils/geojsonImport";
import { sanitizeHtml } from "~~/server/utils/sanitizeHtml";
import { getPlainText } from "~~/server/utils/getPlainText";
import { getEmitter } from "~~/server/utils/getEmitter";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  const body = await readBody(event);
  const db = getDb();
  let plan;
  try {
    plan = prepareGeojsonImport(body);
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : "Ongeldige GeoJSON",
    });
  }
  const availableKeys = new Set(plan.preview.groups.map((group) => group.key));
  const selectedKeys: unknown = body.selectedGroupKeys === undefined ? [...availableKeys] : body.selectedGroupKeys;
  if (
    !Array.isArray(selectedKeys) ||
    !selectedKeys.length ||
    selectedKeys.some((key) => typeof key !== "string" || !availableKeys.has(key)) ||
    new Set(selectedKeys).size !== selectedKeys.length
  ) {
    throw createError({ statusCode: 400, message: "Selecteer minstens één geldige laag" });
  }
  const selectedGroups = new Set<string>(selectedKeys);
  // Recompute the plan on save; never trust preview counts or client category IDs.
  const mappings: CategoryMapping[] = body.categoryProperty
    ? body.mappings
    : [{ key: "all", legend_id: body.legend_id }];
  if (
    !Array.isArray(mappings) ||
    mappings.length !== selectedGroups.size
  ) {
    throw createError({
      statusCode: 400,
      message: "Koppel iedere groep aan een categorie",
    });
  }
  const groupKeys = selectedGroups;
  const targets = new Map<string, CategoryMapping>();
  for (const mapping of mappings) {
    if (!mapping || targets.has(mapping.key) || !groupKeys.has(mapping.key))
      throw createError({
        statusCode: 400,
        message: "Ongeldige of dubbele categoriekoppeling",
      });
    if (mapping.legend_id !== undefined) {
      if (
        !Number.isInteger(mapping.legend_id) ||
        !db.prepare("SELECT id FROM legend WHERE id = ?").get(mapping.legend_id)
      )
        throw createError({
          statusCode: 400,
          message: "Categorie bestaat niet",
        });
    } else if (
      typeof mapping.name !== "string" ||
      !mapping.name.trim() ||
      mapping.name.trim().length > 200 ||
      typeof mapping.color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(mapping.color)
    ) {
      throw createError({
        statusCode: 400,
        message: "Nieuwe categorie vereist een naam en een geldige kleur",
      });
    }
    targets.set(mapping.key, mapping);
  }
  const insert = db.prepare(
    "INSERT INTO issues (title, description, plain_text, legend_id, geometry) VALUES (?, ?, ?, ?, ?)",
  );
  let imported = 0;
  db.exec("BEGIN");
  try {
    const categoryIds = new Map<string, number>();
    const createdNames = new Map<string, number>();
    for (const [key, mapping] of targets) {
      let id = mapping.legend_id;
      if (id === undefined) {
        const name = mapping.name!.trim();
        // Reuse matching categories and a new category shared by multiple groups.
        id =
          createdNames.get(name) ??
          Number(
            db
              .prepare(
                "SELECT id FROM legend WHERE name = ? ORDER BY id LIMIT 1",
              )
              .get(name)?.id ?? 0,
          );
        if (!id)
          id = Number(
            db
              .prepare(
                "INSERT INTO legend (name, color, description) VALUES (?, ?, ?)",
              )
              .run(name, mapping.color!, body.description.trim())
              .lastInsertRowid,
          );
        createdNames.set(name, id);
      }
      categoryIds.set(key, id);
    }
    for (const issue of plan.issues) {
      if (!selectedGroups.has(issue.groupKey)) continue;
      const description = sanitizeHtml(issue.description);
      insert.run(
        issue.title,
        description,
        getPlainText(description),
        categoryIds.get(issue.groupKey)!,
        JSON.stringify(issue.geometry),
      );
      imported++;
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  getEmitter().emit("issues:imported", {
    count: imported,
    createdBy: event.context.user.name || event.context.user.username,
    createdByUserId: event.context.user.id,
  });
  return { imported };
});
