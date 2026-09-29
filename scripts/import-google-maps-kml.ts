import "dotenv/config";
import { DOMParser } from "@xmldom/xmldom";
import type { Geometry, Position } from "geojson";
import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sanitizeHtml } from "../server/utils/sanitizeHtml";

const DEFAULT_LEGEND_COLOR = "#2196F3";
const DEFAULT_STYLE_ID = "default";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]);

export type KmlIssue = {
  title: string;
  description: string;
  geometry: Geometry;
  legendId: string;
};

export type KmlLegend = {
  id: string;
  name: string;
  color: string;
  styleIds: string[];
};

export type KmlParseResult = {
  issues: KmlIssue[];
  legends: KmlLegend[];
  skipped: string[];
};

function elementChildren(element: Element): Element[] {
  return Array.from(element.childNodes)
    .filter((child) => child.nodeType === 1)
    .map((child) => child as Element);
}

function childNamed(element: Element, name: string): Element | undefined {
  return elementChildren(element).find((child) => child.localName === name);
}

function descendantsNamed(element: Element, name: string): Element[] {
  const matches: Element[] = [];
  for (const child of elementChildren(element)) {
    if (child.localName === name) matches.push(child);
    matches.push(...descendantsNamed(child, name));
  }
  return matches;
}

function parseCoordinates(text: string): Position[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((coordinate) => {
      const values = coordinate.split(",").slice(0, 3).map(Number);
      if (
        values.length < 2 ||
        values.some((value) => !Number.isFinite(value))
      ) {
        throw new Error(`Invalid KML coordinate: ${coordinate}`);
      }
      return values as Position;
    });
}

function geometryFromElement(element: Element): Geometry | null {
  if (element.localName === "MultiGeometry") {
    const geometries = elementChildren(element)
      .map(geometryFromElement)
      .filter((geometry): geometry is Geometry => geometry !== null);
    return geometries.length
      ? { type: "GeometryCollection", geometries }
      : null;
  }

  if (element.localName === "Point" || element.localName === "LineString") {
    const coordinates = childNamed(element, "coordinates")?.textContent ?? "";
    const positions = parseCoordinates(coordinates);
    if (element.localName === "Point") {
      return positions[0] ? { type: "Point", coordinates: positions[0] } : null;
    }
    return positions.length >= 2
      ? { type: "LineString", coordinates: positions }
      : null;
  }

  if (element.localName === "Polygon") {
    const rings = [
      ...descendantsNamed(element, "outerBoundaryIs"),
      ...descendantsNamed(element, "innerBoundaryIs"),
    ]
      .map((boundary) => {
        const coordinateText = descendantsNamed(boundary, "coordinates")[0]
          ?.textContent;
        return coordinateText ? parseCoordinates(coordinateText) : [];
      })
      .filter((ring) => ring.length >= 4);
    return rings.length ? { type: "Polygon", coordinates: rings } : null;
  }

  return null;
}

function geometryFromPlacemark(placemark: Element): Geometry | null {
  const geometries = elementChildren(placemark)
    .map(geometryFromElement)
    .filter((geometry): geometry is Geometry => geometry !== null);
  if (geometries.length === 1) return geometries[0];
  return geometries.length ? { type: "GeometryCollection", geometries } : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function topLevelFolderName(element: Element): string {
  const folderNames: string[] = [];
  let ancestor: Node | null = element.parentNode;
  while (ancestor?.nodeType === 1) {
    const parentElement = ancestor as Element;
    if (parentElement.localName === "Folder") {
      const name = childNamed(parentElement, "name")?.textContent.trim();
      if (name) folderNames.push(name);
    }
    ancestor = ancestor.parentNode;
  }
  return folderNames.at(-1) ?? "KML";
}

function colorFromKml(value: string | undefined): string | null {
  const color = value?.trim();
  if (!color || !/^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return null;
  if (color.length === 6) return `#${color}`;
  return `#${color.slice(6, 8)}${color.slice(4, 6)}${color.slice(2, 4)}`;
}

function styleColor(
  id: string,
  stylesById: Map<string, Element>,
  seen = new Set<string>(),
): string {
  if (seen.has(id)) return DEFAULT_LEGEND_COLOR;
  seen.add(id);
  const style = stylesById.get(id);
  if (!style) return DEFAULT_LEGEND_COLOR;

  if (style.localName === "StyleMap") {
    const pairs = elementChildren(style).filter(
      (child) => child.localName === "Pair",
    );
    const pair =
      pairs.find(
        (candidate) =>
          childNamed(candidate, "key")?.textContent.trim() === "normal",
      ) ?? pairs[0];
    const styleUrl = pair
      ? childNamed(pair, "styleUrl")?.textContent.trim()
      : undefined;
    if (styleUrl)
      return styleColor(styleUrl.split("#").at(-1)!, stylesById, seen);
  }

  for (const styleName of ["IconStyle", "LineStyle", "PolyStyle"]) {
    const styleDetails = childNamed(style, styleName);
    const color = styleDetails
      ? childNamed(styleDetails, "color")?.textContent
      : undefined;
    const parsedColor = colorFromKml(color);
    if (parsedColor) return parsedColor;
  }
  return DEFAULT_LEGEND_COLOR;
}

export function extractKmlIssues(xml: string): KmlParseResult {
  const document = new DOMParser({
    onError: (level, message) => {
      if (level === "error" || level === "fatalError") {
        throw new Error(`Invalid KML: ${message}`);
      }
    },
  }).parseFromString(xml, "application/xml");
  const issues: KmlIssue[] = [];
  const skipped: string[] = [];
  const legendsById = new Map<
    string,
    { id: string; name: string; color: string; styleIds: Set<string> }
  >();
  const stylesById = new Map<string, Element>();
  for (const style of [
    ...Array.from(document.getElementsByTagNameNS("*", "Style")),
    ...Array.from(document.getElementsByTagNameNS("*", "StyleMap")),
  ]) {
    const id = style.getAttribute("id");
    if (id) stylesById.set(id, style);
  }

  for (const placemark of Array.from(
    document.getElementsByTagNameNS("*", "Placemark"),
  )) {
    const styleUrl = childNamed(placemark, "styleUrl")?.textContent.trim();
    const styleId = styleUrl ? styleUrl.split("#").at(-1)! : DEFAULT_STYLE_ID;
    const data = descendantsNamed(placemark, "ExtendedData")
      .flatMap((extendedData) => elementChildren(extendedData))
      .filter((element) => element.localName === "Data");
    const fields = data.map((element) => ({
      name: element.getAttribute("name"),
      value: childNamed(element, "value")?.textContent ?? "",
    }));
    const title = fields.find((field) => field.name === "Waar")?.value.trim();
    const placemarkName = childNamed(placemark, "name")?.textContent.trim();
    const geometry = geometryFromPlacemark(placemark);

    if (!title) {
      skipped.push(
        `${placemarkName || "(unnamed)"}: Data name="Waar" is empty`,
      );
      continue;
    }
    if (!geometry) {
      skipped.push(`${title}: no supported geometry`);
      continue;
    }

    const folderName = topLevelFolderName(placemark);
    const urgency = fields
      .find(({ name }) => name.trim().toLowerCase() === "urgentie")
      ?.value.trim();
    const legendId = urgency
      ? `${folderName}:urgency:${urgency.toLowerCase()}`
      : `${folderName}:style:${styleId}`;
    const legendName = urgency
      ? `${folderName} - ${urgency}`
      : folderName === "KML"
        ? `KML: ${styleId}`
        : folderName;
    const legend = legendsById.get(legendId) ?? {
      id: legendId,
      name: legendName,
      color: styleColor(styleId, stylesById),
      styleIds: new Set<string>(),
    };
    legend.styleIds.add(styleId);
    legendsById.set(legendId, legend);

    const sourceDescription =
      childNamed(placemark, "description")?.textContent ?? "";
    const sourceImages = sourceDescription.match(/<img\b[^>]*>/gi) ?? [];
    const metadata = fields
      .filter(
        ({ name }) =>
          !["gps locatie", "gx_media_links"].includes(
            name.trim().toLowerCase(),
          ),
      )
      .map(
        ({ name, value }) =>
          `<h3>${escapeHtml(name)}</h3><p>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p>`,
      )
      .join("");
    issues.push({
      title,
      description: sanitizeHtml(
        [...sourceImages, metadata].filter(Boolean).join("<br>"),
      ),
      geometry,
      legendId,
    });
  }

  const legends = Array.from(legendsById.values(), (legend) => ({
    ...legend,
    styleIds: Array.from(legend.styleIds),
  }));
  return { issues, legends, skipped };
}

async function downloadImageAsDataUrl(url: string): Promise<string> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Unsupported image URL protocol: ${parsedUrl.protocol}`);
  }

  const response = await fetch(parsedUrl, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}): ${url}`);
  }

  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (!contentType || !IMAGE_TYPES.has(contentType)) {
    throw new Error(
      `Unsupported image type "${contentType ?? "unknown"}": ${url}`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds the 10 MB limit: ${url}`);
  }
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

export async function inlineImageUrls(
  html: string,
  downloadImage = downloadImageAsDataUrl,
): Promise<string> {
  const imageTagPattern = /<img\b[^>]*>/gi;
  const sourcePattern = /(\bsrc\s*=\s*)(["'])(.*?)\2/i;
  const downloaded = new Map<string, string>();
  let output = "";
  let position = 0;

  for (const match of html.matchAll(imageTagPattern)) {
    const tag = match[0];
    const index = match.index ?? position;
    output += html.slice(position, index);
    position = index + tag.length;

    const source = tag.match(sourcePattern);
    const url = source?.[3];
    if (!source || !url || url.startsWith("data:")) {
      output += tag;
      continue;
    }

    let dataUrl = downloaded.get(url);
    if (!dataUrl) {
      dataUrl = await downloadImage(url);
      downloaded.set(url, dataUrl);
    }
    const escapedDataUrl = dataUrl
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    output += tag.replace(
      source[0],
      `${source[1]}${source[2]}${escapedDataUrl}${source[2]}`,
    );
  }

  return output + html.slice(position);
}

type CliOptions = {
  kmlPath: string;
  dryRun: boolean;
};

function parseArguments(args: string[]): CliOptions {
  const [kmlPath, ...options] = args[0] === "--" ? args.slice(1) : args;
  if (!kmlPath) throw new Error("A KML file path is required.");

  const result: CliOptions = { kmlPath, dryRun: false };
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (option === "--dry-run") {
      result.dryRun = true;
    } else {
      throw new Error(`Unknown or incomplete option: ${option}`);
    }
  }
  return result;
}

async function main(args: string[]): Promise<void> {
  const options = parseArguments(args);
  const kmlPath = resolve(options.kmlPath);
  if (!existsSync(kmlPath)) throw new Error(`KML file not found: ${kmlPath}`);

  const databasePath = process.env.NUXT_DB_PATH;
  if (!databasePath) throw new Error("NUXT_DB_PATH is not set.");
  if (!existsSync(databasePath)) {
    throw new Error(`Database file not found: ${resolve(databasePath)}`);
  }

  const parsed = extractKmlIssues(readFileSync(kmlPath, "utf8"));
  const db = new DatabaseSync(databasePath);
  try {
    const preparedIssues = await Promise.all(
      parsed.issues.map(async (issue) => ({
        ...issue,
        description: options.dryRun
          ? issue.description
          : await inlineImageUrls(issue.description),
      })),
    );

    console.log("Folders: all");
    console.log(`Database: ${resolve(databasePath)}`);
    console.log(`Legends: ${parsed.legends.length}`);
    for (const legend of parsed.legends) {
      console.log(`Legend: ${legend.name} (${legend.color})`);
    }
    console.log(`Ready to import: ${preparedIssues.length}`);
    for (const skipped of parsed.skipped) console.warn(`Skipped: ${skipped}`);

    if (options.dryRun) {
      console.log("Dry run: no rows were inserted.");
      return;
    }

    const findLegend = db.prepare("SELECT id FROM legend WHERE name = ?");
    const findLegacyLegend = db.prepare("SELECT id FROM legend WHERE name = ?");
    const renameLegacyLegend = db.prepare(
      "UPDATE legend SET name = ?, description = ?, color = ? WHERE id = ?",
    );
    const insertLegend = db.prepare(
      "INSERT INTO legend (name, description, color) VALUES (?, ?, ?)",
    );
    const insertIssue = db.prepare(
      "INSERT INTO issues (title, description, legend_id, geometry) VALUES (?, ?, ?, ?)",
    );
    const findExistingIssue = db.prepare(
      "SELECT id FROM issues WHERE title = ? AND geometry = ?",
    );
    const updateIssue = db.prepare(
      "UPDATE issues SET description = ?, legend_id = ? WHERE id = ?",
    );
    db.exec("BEGIN");
    try {
      const legendIds = new Map<string, number>();
      for (const legend of parsed.legends) {
        const existingLegend = findLegend.get(legend.name) as
          | { id: number }
          | undefined;
        let legendId = existingLegend?.id;
        if (legendId === undefined && legend.styleIds.length === 1) {
          const legacyLegend = findLegacyLegend.get(
            `KML: ${legend.styleIds[0]}`,
          ) as { id: number } | undefined;
          if (legacyLegend) {
            renameLegacyLegend.run(
              legend.name,
              "Dummy tekst",
              legend.color,
              legacyLegend.id,
            );
            legendId = legacyLegend.id;
          }
        }
        legendId ??= Number(
          insertLegend.run(legend.name, "Dummy tekst", legend.color)
            .lastInsertRowid,
        );
        legendIds.set(legend.id, legendId);
      }

      let insertedCount = 0;
      let existingCount = 0;
      for (const issue of preparedIssues) {
        const geometry = JSON.stringify(issue.geometry);
        const existingIssue = findExistingIssue.get(issue.title, geometry) as
          | { id: number }
          | undefined;
        if (existingIssue) {
          updateIssue.run(
            issue.description,
            legendIds.get(issue.legendId),
            existingIssue.id,
          );
          existingCount++;
          continue;
        }
        insertIssue.run(
          issue.title,
          issue.description,
          legendIds.get(issue.legendId),
          geometry,
        );
        insertedCount++;
      }
      db.exec("COMMIT");
      console.log(
        `Imported ${insertedCount} issues, updated ${existingCount} existing issues, and ensured ${parsed.legends.length} legends.`,
      );
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    console.error("Usage: pnpm import:kml -- <file.kml> [--dry-run]");
    process.exitCode = 1;
  });
}
