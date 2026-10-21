import type { Geometry, Point, LineString, Polygon } from "geojson";
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

export function parseGeojsonImport(
  data: unknown,
  title: string,
  description: string,
  titleProperty?: string,
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
  if (collection.features.length > 10000)
    throw new Error("Maximaal 10000 objecten per import");
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
      const propertyTitle = titleProperty
        ? properties[titleProperty]
        : undefined;
      const issueTitle =
        typeof propertyTitle === "string" || typeof propertyTitle === "number"
          ? String(propertyTitle).trim()
          : "";
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
      }));
    } catch (error) {
      throw new Error(
        `Object ${index + 1}: ${error instanceof Error ? error.message : "Ongeldige geometrie"}`,
        { cause: error },
      );
    }
  });
  if (issues.length > 10000)
    throw new Error("Maximaal 10000 geometrieën per import");
  return issues;
}
