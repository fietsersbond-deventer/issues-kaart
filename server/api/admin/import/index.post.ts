import type {
  CategoryMappings,
  ImportResult,
  ImportSettings,
} from "~~/shared/types/GeojsonImport";
import {
  buildImportIssues,
  findRemoteImageUrls,
  listCategoryValues,
  listImportFields,
  parseFeatureCollection,
} from "~~/shared/utils/geojsonImport";
import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { sanitizeHtml } from "~~/server/utils/sanitizeHtml";
import { getPlainText } from "~~/shared/utils/getPlainText";
import { getDb } from "~~/server/utils/db";
import { getEmitter } from "~~/server/utils/getEmitter";
import { createUniqueIssueSlug } from "~~/server/utils/issueSlugs";
import { createImportTag } from "~~/server/utils/issueTags";
import {
  findImportImageIds,
  importImageExists,
  removeImportImages,
  resolveImportImages,
} from "~~/server/utils/importImages";
import { toCategoryColor } from "~~/shared/utils/categoryColors";

const countImages = (html: string) => html.match(/<img\b/gi)?.length ?? 0;

function badRequest(message: string): never {
  throw createError({ statusCode: 400, message });
}

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

function validateSettings(value: unknown, fields: Set<string>): ImportSettings {
  const settings = value as Partial<ImportSettings> | null;
  if (!settings || !isText(settings.title)) {
    badRequest("Standaardtitel is verplicht");
  }
  if (
    settings.description !== undefined &&
    settings.description !== null &&
    typeof settings.description !== "string"
  ) {
    badRequest("Standaardbeschrijving moet tekst zijn");
  }
  for (const key of ["titleField", "categoryField", "htmlField"] as const) {
    const field = settings[key];
    // A cleared select sends null; treat it as "no field".
    if (field === null) settings[key] = undefined;
    else if (
      field !== undefined &&
      !(typeof field === "string" && fields.has(field))
    ) {
      badRequest(`Gegevensveld "${String(field)}" bestaat niet in het bestand`);
    }
  }
  if (
    !Array.isArray(settings.fields) ||
    settings.fields.some(
      (field) => typeof field !== "string" || !fields.has(field),
    )
  ) {
    badRequest("Kies alleen gegevensvelden die in het bestand voorkomen");
  }
  return settings as ImportSettings;
}

export default defineEventHandler(async (event): Promise<ImportResult> => {
  requireAdminSession(event);
  const body = await readBody<{
    geojson?: unknown;
    settings?: unknown;
    mappings?: unknown;
    fileName?: unknown;
  }>(event);

  let collection;
  try {
    collection = parseFeatureCollection(body?.geojson);
  } catch (error) {
    badRequest(error instanceof Error ? error.message : "Ongeldige GeoJSON");
  }
  const fields = new Set(listImportFields(collection).map(({ name }) => name));
  const settings = validateSettings(body.settings, fields);

  const mappings = body.mappings as CategoryMappings | null | undefined;
  if (!mappings || typeof mappings !== "object" || Array.isArray(mappings)) {
    badRequest("Koppel minstens één waarde aan een categorie");
  }
  const values = new Set(
    listCategoryValues(collection, settings.categoryField).map(
      ({ value }) => value,
    ),
  );
  const entries = Object.entries(mappings);
  if (!entries.length)
    badRequest("Koppel minstens één waarde aan een categorie");

  const db = getDb();
  const legendExists = db.prepare("SELECT 1 FROM legend WHERE id = ?");
  const legendNamed = db.prepare(
    "SELECT 1 FROM legend WHERE lower(name) = lower(?)",
  );
  const newNames = new Set<string>();
  for (const [value, target] of entries) {
    if (!values.has(value))
      badRequest(`Waarde "${value}" komt niet voor in het bestand`);
    if (target && "legend_id" in target) {
      if (
        !Number.isInteger(target.legend_id) ||
        !legendExists.get(target.legend_id)
      ) {
        badRequest(`Categorie voor "${value}" bestaat niet`);
      }
    } else if (target && "name" in target) {
      const name = isText(target.name) ? target.name.trim() : "";
      const color = toCategoryColor(target.color);
      if (!name || !color) {
        badRequest(
          `Nieuwe categorie voor "${value}" heeft een naam en een toegestane kleur nodig`,
        );
      }
      target.color = color;
      if (legendNamed.get(name)) {
        badRequest(
          `Categorie "${name}" bestaat al; kies de bestaande categorie`,
        );
      }
      newNames.add(name.toLowerCase());
    } else {
      badRequest(`Ongeldige categorie voor "${value}"`);
    }
  }

  let issues;
  try {
    issues = buildImportIssues(collection, settings, mappings);
  } catch (error) {
    badRequest(error instanceof Error ? error.message : "Ongeldige geometrie");
  }
  if (!issues.length) badRequest("Er zijn geen objecten om te importeren");

  const imageIds = new Set<string>();
  for (const issue of issues) {
    // Remote images would break once the source map is deleted.
    if (findRemoteImageUrls(issue.description).length) {
      badRequest(
        `"${issue.title}" bevat nog afbeeldingen die niet zijn gedownload`,
      );
    }
    for (const id of findImportImageIds(issue.description)) {
      if (!importImageExists(id)) {
        badRequest(
          "Een of meer afbeeldingen zijn verlopen; ga terug en verwerk ze opnieuw",
        );
      }
      imageIds.add(id);
    }
  }

  const user = event.context.user;
  const fileName =
    typeof body.fileName === "string" && body.fileName.trim()
      ? body.fileName.trim().slice(0, 100)
      : "bestand";
  const importedAt = new Date();
  const when = importedAt.toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    dateStyle: "short",
    timeStyle: "short",
  });
  const insertLegend = db.prepare(
    "INSERT INTO legend (name, color) VALUES (?, ?)",
  );
  const insertIssue = db.prepare(
    "INSERT INTO issues (title, slug, description, plain_text, legend_id, geometry, updated_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
  );
  const insertIssueTag = db.prepare(
    "INSERT INTO issue_tags (issue_id, tag_id) VALUES (?, ?)",
  );
  let tag: string;
  const report = { issuesWithImage: 0, images: 0, removedImages: 0 };
  db.exec("BEGIN IMMEDIATE");
  try {
    // Every import gets its own tag, so its issues can be found afterwards.
    const importTag = createImportTag(
      db,
      {
        label: `Import ${fileName} (${when})`,
        description: `Onderwerpen geïmporteerd uit ${fileName} door ${user?.name || user?.username || "onbekend"} op ${when}.`,
      },
      importedAt,
    );
    tag = importTag.tag;
    const legendIds = new Map<string, number>();
    const createdLegends = new Map<string, number>();
    for (const [value, target] of entries) {
      if ("legend_id" in target) {
        legendIds.set(value, target.legend_id);
        continue;
      }
      // Several values may share one new category name.
      const key = target.name.trim().toLowerCase();
      let id = createdLegends.get(key);
      if (id === undefined) {
        id = Number(
          insertLegend.run(target.name.trim(), target.color).lastInsertRowid,
        );
        createdLegends.set(key, id);
      }
      legendIds.set(value, id);
    }
    for (const issue of issues) {
      // Images are added one issue at a time to keep memory use low.
      const resolved = resolveImportImages(issue.description);
      const description = sanitizeHtml(resolved);
      // Counted for the report shown after the import.
      const imagesAfter = countImages(description);
      report.images += imagesAfter;
      if (imagesAfter > 0) report.issuesWithImage++;
      report.removedImages += countImages(resolved) - imagesAfter;
      const { lastInsertRowid } = insertIssue.run(
        issue.title,
        createUniqueIssueSlug(db, issue.title),
        description,
        getPlainText(description),
        legendIds.get(issue.categoryValue)!,
        JSON.stringify(issue.geometry),
        user?.id ?? null,
      );
      insertIssueTag.run(lastInsertRowid, importTag.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  console.log(
    `[import] ${issues.length} issues saved with tag ${tag}: ${report.issuesWithImage} with ${report.images} image(s), ${report.removedImages} removed by the sanitizer`,
  );
  await removeImportImages(imageIds);

  // One notification for the whole import instead of one per issue.
  getEmitter().emit("issues:imported", {
    count: issues.length,
    createdBy: user?.name || user?.username || "Onbekend",
    createdByUserId: user?.id || 0,
  });
  return { issues: issues.length, legends: newNames.size, tag, ...report };
});
