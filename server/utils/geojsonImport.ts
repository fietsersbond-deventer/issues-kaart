import type { Geometry, Point, LineString, Polygon } from "geojson";
import type { ImportPreview } from "~~/shared/types/GeojsonImport";
import { mergeLineSegments } from "./mergeLineSegments";
import { booleanValid } from "@turf/boolean-valid";

type EditableGeometry = Point | LineString | Polygon;
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

function splitGeometry(geometry: Geometry): EditableGeometry[] {
  switch (geometry.type) {
    case "Point":
    case "LineString":
    case "Polygon":
      return [geometry];
    case "MultiPoint":
      return geometry.coordinates.map((coordinates) => ({
        type: "Point",
        coordinates,
      }));
    case "MultiLineString":
      return geometry.coordinates.map((coordinates) => ({
        type: "LineString",
        coordinates,
      }));
    case "MultiPolygon":
      return geometry.coordinates.map((coordinates) => ({
        type: "Polygon",
        coordinates,
      }));
    case "GeometryCollection":
      return geometry.geometries.flatMap(splitGeometry);
    default:
      throw new Error("Onbekend geometrietype");
  }
}

function canonicalProperties(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalProperties);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalProperties(item)]),
    );
  return value;
}

export function parseGeojsonImport(
  data: unknown,
  title: string,
  description: string,
  titleProperty?: string,
  categoryProperty?: string,
  mergeProperty?: string,
) {
  const collection = data as {
    type?: string;
    features?: {
      type?: string;
      geometry: Geometry;
      properties?: Record<string, unknown> | null;
    }[];
  } | null;
  if (
    collection?.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    !collection.features.length
  ) {
    throw new Error("Upload een GeoJSON FeatureCollection met objecten");
  }
  if (collection.features.length > 50000)
    throw new Error("Maximaal 50000 objecten per import");
  const issues = collection.features.flatMap((feature, index) => {
    try {
      if (feature.type !== "Feature" || !feature.geometry)
        throw new Error("Geometrie ontbreekt");
      const geometries = splitGeometry(feature.geometry);
      if (!geometries.length) throw new Error("Lege geometrie");
      for (const geometry of geometries) {
        const checkCoordinates = (coordinates: unknown): boolean => {
          if (!Array.isArray(coordinates) || !coordinates.length) return false;
          if (typeof coordinates[0] === "number")
            return (
              coordinates.length >= 2 &&
              coordinates.every(
                (value) => typeof value === "number" && Number.isFinite(value),
              ) &&
              Math.abs(coordinates[0]) <= 180 &&
              Math.abs(coordinates[1]) <= 90
            );
          return coordinates.every(checkCoordinates);
        };
        if (!checkCoordinates(geometry.coordinates) || !booleanValid(geometry))
          throw new Error("Ongeldige WGS84-geometrie");
      }
      const properties = feature.properties ?? {};
      if (typeof properties !== "object" || Array.isArray(properties))
        throw new Error("Ongeldige attributen");
      const categoryValue = categoryProperty
        ? (properties[categoryProperty] ?? null)
        : null;
      if (
        categoryValue !== null &&
        !["string", "number", "boolean"].includes(typeof categoryValue)
      )
        throw new Error(
          "Kies een categorieattribuut met tekst, getallen of booleans",
        );
      const propertyTitle = titleProperty
        ? properties[titleProperty]
        : undefined;
      const issueTitle =
        typeof propertyTitle === "string" || typeof propertyTitle === "number"
          ? String(propertyTitle).trim()
          : "";
      const mergeValue = mergeProperty ? properties[mergeProperty] : undefined;
      // Matching complete attributes prevents discarding different network classes,
      // IDs or other source information when combining a road's blocks.
      const mergeKey =
        (typeof mergeValue === "string" && mergeValue.trim()) ||
        typeof mergeValue === "number"
          ? JSON.stringify([
              categoryValue,
              issueTitle || title,
              canonicalProperties(properties),
            ])
          : undefined;
      const attributes = Object.entries(properties)
        .map(
          ([key, value]) =>
            `<p><strong>${escapeHtml(key)}</strong>: ${escapeHtml(typeof value === "object" ? JSON.stringify(value) : String(value))}</p>`,
        )
        .join("");
      return geometries.map((geometry) => ({
        title: issueTitle || title,
        description: `<p>${escapeHtml(description)}</p>${attributes}`,
        geometry,
        sourceIndex: index,
        sourceIndexes: [index],
        mergeKey,
        groupKey: categoryProperty ? JSON.stringify(categoryValue) : "all",
        groupLabel: categoryProperty
          ? categoryValue === null
            ? "(ontbreekt)"
            : categoryValue === ""
              ? "(leeg)"
              : String(categoryValue)
          : "Alle objecten",
      }));
    } catch (error) {
      throw new Error(
        `Object ${index + 1}: ${error instanceof Error ? error.message : "Ongeldige geometrie"}`,
        { cause: error },
      );
    }
  });
  if (issues.length > 50000)
    throw new Error("Maximaal 50000 geometrieën per import");
  return issues;
}

export function prepareGeojsonImport(body: unknown) {
  const input = body as {
    geojson?: unknown;
    title?: unknown;
    description?: unknown;
    titleProperty?: unknown;
    categoryProperty?: unknown;
    mergeLines?: unknown;
    mergeProperty?: unknown;
  } | null;
  if (
    !input ||
    typeof input.title !== "string" ||
    !input.title.trim() ||
    typeof input.description !== "string" ||
    !input.description.trim() ||
    (input.titleProperty !== undefined &&
      typeof input.titleProperty !== "string") ||
    (input.categoryProperty !== undefined &&
      typeof input.categoryProperty !== "string") ||
    (input.mergeLines !== undefined && typeof input.mergeLines !== "boolean") ||
    (input.mergeProperty !== undefined &&
      typeof input.mergeProperty !== "string")
  ) {
    throw new Error(
      "Titel en beschrijving zijn verplicht; attribuutnamen moeten tekst zijn",
    );
  }
  const segments = parseGeojsonImport(
    input.geojson,
    input.title.trim(),
    input.description.trim(),
    input.titleProperty as string | undefined,
    input.categoryProperty as string | undefined,
    input.mergeLines ? (input.mergeProperty as string | undefined) : undefined,
  );
  const collection = input.geojson as {
    features: {
      geometry: Geometry;
      properties?: Record<string, unknown> | null;
    }[];
  };
  const attributes = [
    ...new Set(
      collection.features.flatMap((feature) =>
        Object.keys(feature.properties ?? {}),
      ),
    ),
  ].sort();
  if (
    input.categoryProperty &&
    !attributes.includes(input.categoryProperty as string)
  )
    throw new Error("Categorieattribuut bestaat niet");
  if (
    input.mergeLines &&
    (typeof input.mergeProperty !== "string" ||
      !input.mergeProperty.trim() ||
      !attributes.includes(input.mergeProperty))
  )
    throw new Error(
      "Kies een bestaand straatattribuut om lijnen samen te voegen",
    );
  const issues = input.mergeLines ? mergeLineSegments(segments) : segments;
  const geometries: Record<string, number> = {};
  for (const feature of collection.features)
    geometries[feature.geometry.type] =
      (geometries[feature.geometry.type] ?? 0) + 1;
  const groups = new Map<
    string,
    { label: string; sources: Set<number>; issues: number }
  >();
  for (const issue of issues) {
    const group = groups.get(issue.groupKey) ?? {
      label: issue.groupLabel,
      sources: new Set<number>(),
      issues: 0,
    };
    for (const index of issue.sourceIndexes) group.sources.add(index);
    group.issues++;
    groups.set(issue.groupKey, group);
  }
  if (groups.size > 200)
    throw new Error(
      "Meer dan 200 categoriegroepen. Kies een ander attribuut of één categorie voor alle objecten.",
    );
  const preview: ImportPreview = {
    sourceFeatures: collection.features.length,
    lineSegments: segments.filter(
      (issue) => issue.geometry.type === "LineString",
    ).length,
    lines: issues.filter((issue) => issue.geometry.type === "LineString")
      .length,
    issues: issues.length,
    attributes,
    geometries,
    groups: [...groups].map(([key, group]) => ({
      key,
      label: group.label,
      sourceFeatures: group.sources.size,
      issues: group.issues,
    })),
  };
  return { issues, preview };
}
