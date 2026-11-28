import type { Feature, FeatureCollection, Geometry } from "geojson";
import { kmlWithFolders, type Folder, type Root } from "@tmcw/togeojson";
import { unzip, type Unzipped } from "fflate";
import {
  escapeHtml,
  findImageSources,
  parseFeatureCollection,
  replaceImageSources,
} from "~~/shared/utils/geojsonImport";

export const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Image source for an image inside a KMZ archive. The bytes stay in
 * `ImportFile.images` and are uploaded one by one, instead of being turned
 * into data URLs that would all be kept in memory.
 */
export const KMZ_IMAGE_PREFIX = "kmz-file:";

export type KmzImage = { bytes: Uint8Array; type: string };

export type ImportFile = {
  collection: FeatureCollection;
  /** Images from a KMZ archive, by their `kmz-file:` source. */
  images: Map<string, KmzImage>;
};

const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

/** KML styling that togeojson adds as properties; not useful as content. */
const STYLE_PROPERTY =
  /^(style|stroke|fill|icon|label|@geometry-type$|visibility$)/;

function joinPath(directory: string, path: string): string {
  const parts = directory ? directory.split("/") : [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

/**
 * Normalizes one KML feature: HTML description as text, Google My Maps media
 * links as images, folder path as a field and style properties removed.
 */
function normalizeKmlFeature(
  feature: Feature<Geometry | null>,
  folder: string,
  localImage: (source: string) => string | undefined,
): Feature<Geometry | null> {
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(feature.properties ?? {})) {
    if (!STYLE_PROPERTY.test(key)) properties[key] = value;
  }

  const rawDescription = properties.description as
    string | { value?: string } | undefined;
  let description =
    typeof rawDescription === "object"
      ? (rawDescription?.value ?? "")
      : (rawDescription ?? "");

  const mediaLinks = properties.gx_media_links;
  delete properties.gx_media_links;
  if (typeof mediaLinks === "string") {
    const present = new Set(findImageSources(description));
    for (const url of mediaLinks.split(/\s+/).filter(Boolean)) {
      if (!present.has(url)) description += `<img src="${escapeHtml(url)}">`;
    }
  }

  const replacements = new Map<string, string | null>();
  for (const source of findImageSources(description)) {
    const reference = localImage(source);
    if (reference) replacements.set(source, reference);
  }
  description = replaceImageSources(description, replacements);

  if (description) properties.description = description;
  else delete properties.description;
  if (folder) properties.folder = folder;
  return { ...feature, properties };
}

function flattenFolders(
  node: Root | Folder,
  path: string[],
  localImage: (source: string) => string | undefined,
): Feature<Geometry | null>[] {
  return node.children.flatMap((child) => {
    if (child.type === "folder") {
      const name = String(child.meta.name ?? "").trim();
      return flattenFolders(child, name ? [...path, name] : path, localImage);
    }
    return [normalizeKmlFeature(child, path.join(" / "), localImage)];
  });
}

/** Converts KML text to GeoJSON. Placemarks without geometry are skipped. */
export function kmlToGeojson(
  text: string,
  localImage: (source: string) => string | undefined = () => undefined,
): FeatureCollection {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.getElementsByTagName("parsererror").length) {
    throw new Error("Het KML-bestand is ongeldig");
  }
  const root = kmlWithFolders(document, { skipNullGeometry: true });
  return {
    type: "FeatureCollection",
    features: flattenFolders(root, [], localImage) as Feature[],
  };
}

/** fflate's asynchronous unzip runs in Web Workers and keeps the page responsive. */
function unzipAsync(bytes: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) =>
    unzip(bytes, (error, entries) =>
      error ? reject(error) : resolve(entries),
    ),
  );
}

/**
 * Converts a KMZ archive to GeoJSON. Images inside the archive get a
 * `kmz-file:` source; their bytes are returned separately.
 */
export async function kmzToGeojson(bytes: Uint8Array): Promise<ImportFile> {
  let entries: Unzipped;
  try {
    entries = await unzipAsync(bytes);
  } catch {
    throw new Error("Het KMZ-bestand is geen geldig zip-archief");
  }
  const kmlPaths = Object.keys(entries).filter((path) =>
    path.toLowerCase().endsWith(".kml"),
  );
  const kmlPath =
    kmlPaths.find((path) => path.toLowerCase() === "doc.kml") ?? kmlPaths[0];
  if (!kmlPath) throw new Error("Het KMZ-bestand bevat geen KML");
  const directory = kmlPath.includes("/")
    ? kmlPath.slice(0, kmlPath.lastIndexOf("/"))
    : "";

  const images = new Map<string, KmzImage>();
  const localImage = (source: string) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(source)) return undefined;
    const path = joinPath(directory, decodeURIComponent(source));
    const type = IMAGE_MIME_TYPES[path.split(".").pop()!.toLowerCase()];
    const data = entries[path];
    if (!data || !type) return undefined;
    const reference = `${KMZ_IMAGE_PREFIX}${path}`;
    images.set(reference, { bytes: data, type });
    return reference;
  };
  const collection = kmlToGeojson(
    new TextDecoder().decode(entries[kmlPath]),
    localImage,
  );
  return { collection, images };
}

/** Reads a .geojson/.json, .kml or .kmz file as a GeoJSON FeatureCollection. */
export async function readImportFile(file: File): Promise<ImportFile> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("Het bestand is groter dan 25 MB");
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "kmz") {
    return kmzToGeojson(new Uint8Array(await file.arrayBuffer()));
  }
  const images = new Map<string, KmzImage>();
  if (extension === "kml") {
    return { collection: kmlToGeojson(await file.text()), images };
  }
  if (extension === "geojson" || extension === "json") {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error("Het bestand bevat geen geldige JSON");
    }
    return { collection: parseFeatureCollection(data), images };
  }
  throw new Error("Kies een .geojson-, .json-, .kml- of .kmz-bestand");
}
