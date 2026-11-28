import type { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import { flattenEach } from "@turf/meta";
import { truncate } from "@turf/truncate";
import { booleanValid } from "@turf/boolean-valid";
import type {
  CategoryMappings,
  CategoryValue,
  ImportField,
  ImportGeometry,
  ImportIssue,
  ImportSettings,
} from "../types/GeojsonImport";

/**
 * Validates the outer structure of an uploaded GeoJSON file. Geometries are
 * validated per feature in `buildImportIssues`.
 */
export function parseFeatureCollection(data: unknown): FeatureCollection {
  const collection = data as Partial<FeatureCollection> | null;
  if (
    !collection ||
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features)
  ) {
    throw new Error("Het bestand is geen GeoJSON FeatureCollection");
  }
  collection.features.forEach((feature, index) => {
    if (!feature || feature.type !== "Feature") {
      throw new Error(`Object ${index + 1} is geen GeoJSON Feature`);
    }
    const properties: unknown = feature.properties;
    if (
      properties !== null &&
      properties !== undefined &&
      (typeof properties !== "object" || Array.isArray(properties))
    ) {
      throw new Error(`Object ${index + 1} heeft ongeldige gegevensvelden`);
    }
  });
  return collection as FeatureCollection;
}

/** Text form of a field value; objects and arrays become JSON. */
export function fieldText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

/** All field names in file order, with a first non-empty sample value. */
export function listImportFields(collection: FeatureCollection): ImportField[] {
  const samples = new Map<string, string>();
  for (const feature of collection.features) {
    for (const [name, value] of Object.entries(feature.properties ?? {})) {
      if (!samples.get(name)) samples.set(name, fieldText(value));
    }
  }
  return Array.from(samples, ([name, sample]) => ({ name, sample }));
}

export function categoryValueOf(
  properties: GeoJsonProperties,
  categoryField: string | undefined,
): string {
  return categoryField ? fieldText(properties?.[categoryField]) : "";
}

/** Unique category values with their number of features, most frequent first. */
export function listCategoryValues(
  collection: FeatureCollection,
  categoryField: string | undefined,
): CategoryValue[] {
  const counts = new Map<string, number>();
  for (const feature of collection.features) {
    if (!feature.geometry) continue;
    const value = categoryValueOf(feature.properties, categoryField);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

/**
 * Description HTML: the HTML field and the chosen fields that are not used as
 * title, category or HTML. The default description is only used when the
 * feature has no content of its own, like the default title.
 * The HTML field is not sanitized here; the server does that on save.
 */
export function buildImportDescription(
  properties: GeoJsonProperties,
  settings: ImportSettings,
): string {
  const parts: string[] = [];
  const html = settings.htmlField
    ? fieldText(properties?.[settings.htmlField])
    : "";
  if (html) parts.push(html);
  // Fields used for title, category or HTML are not repeated.
  const used = [
    settings.titleField,
    settings.categoryField,
    settings.htmlField,
  ];
  for (const field of settings.fields) {
    if (used.includes(field)) continue;
    const value = fieldText(properties?.[field]);
    if (value)
      parts.push(`<h3>${escapeHtml(field)}</h3><p>${textToHtml(value)}</p>`);
  }
  const fallback = settings.description?.trim();
  if (!parts.length && fallback) parts.push(`<p>${textToHtml(fallback)}</p>`);
  return parts.join("");
}

function isWgs84(coordinates: unknown): boolean {
  if (!Array.isArray(coordinates)) return false;
  if (typeof coordinates[0] === "number") {
    const [longitude, latitude] = coordinates as number[];
    return (
      Number.isFinite(longitude) &&
      Number.isFinite(latitude) &&
      Math.abs(longitude!) <= 180 &&
      Math.abs(latitude!) <= 90
    );
  }
  return coordinates.every(isWgs84);
}

/**
 * Turns the features with a mapped category value into issues. Multi-geometries
 * and geometry collections are split, because an issue holds one geometry.
 * Coordinates are reduced to 2D (KML adds an altitude).
 */
export function buildImportIssues(
  collection: FeatureCollection,
  settings: ImportSettings,
  mappings: CategoryMappings,
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  collection.features.forEach((feature, index) => {
    if (!feature.geometry) return;
    const categoryValue = categoryValueOf(
      feature.properties,
      settings.categoryField,
    );
    if (!(categoryValue in mappings)) return;

    const title =
      (settings.titleField &&
        fieldText(feature.properties?.[settings.titleField])) ||
      settings.title.trim();
    const description = buildImportDescription(feature.properties, settings);
    try {
      flattenEach(feature, (part: Feature) => {
        if (!part.geometry) return;
        const geometry = truncate(part.geometry, {
          precision: 7,
          coordinates: 2,
        }) as ImportGeometry;
        if (!isWgs84(geometry.coordinates)) {
          throw new Error(
            "coördinaten zijn geen WGS84 (lengte- en breedtegraad)",
          );
        }
        if (!booleanValid(geometry)) throw new Error("ongeldige geometrie");
        issues.push({ title, description, geometry, categoryValue });
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Object ${index + 1}: ${reason}`, { cause: error });
    }
  });
  return issues;
}

const imageTagPattern = /<img\b[^>]*>/gi;
const imageSourcePattern = /\bsrc\s*=\s*(["'])(.*?)\1/i;

function imageSource(match: RegExpMatchArray | null): string | undefined {
  // Attribute values may encode "&" in query strings as "&amp;".
  return match?.[2]?.trim().replace(/&amp;/g, "&");
}

/** Distinct image sources in HTML. */
export function findImageSources(html: string): string[] {
  const sources = new Set<string>();
  for (const [tag] of html.matchAll(imageTagPattern)) {
    const source = imageSource(tag.match(imageSourcePattern));
    if (source) sources.add(source);
  }
  return Array.from(sources);
}

/** Distinct http(s) image sources in HTML. */
export function findRemoteImageUrls(html: string): string[] {
  return findImageSources(html).filter((source) =>
    /^https?:\/\//i.test(source),
  );
}

/**
 * Replaces image sources. A replacement of `null` removes the image tag.
 * Sources without a replacement stay as they are.
 */
export function replaceImageSources(
  html: string,
  replacements: Map<string, string | null>,
): string {
  return html.replace(imageTagPattern, (tag) => {
    const match = tag.match(imageSourcePattern);
    const source = imageSource(match);
    if (!match || !source || !replacements.has(source)) return tag;
    const replacement = replacements.get(source);
    if (replacement === null || replacement === undefined) return "";
    const quote = match[1]!;
    return tag.replace(
      match[0],
      `src=${quote}${replacement.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}${quote}`,
    );
  });
}
