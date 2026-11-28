import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

/**
 * Images of an import are processed one by one before the import itself and
 * kept in a private temporary folder. The browser only gets a short
 * reference ("import-image:<uuid>"), so it never holds all images in memory
 * and the import request stays small.
 */
export const IMPORT_IMAGE_PREFIX = "import-image:";

/** Same limits as images pasted in the editor (see quillConfig.ts). */
const MAX_DIMENSION = 1000;
const JPEG_QUALITY = 70;
/** Unused images (e.g. from an abandoned import) are removed after this. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const referencePattern = new RegExp(
  `${IMPORT_IMAGE_PREFIX}([0-9a-f-]{36})`,
  "g",
);

/**
 * A folder with a unique name per server process (mkdtemp), so it never
 * clashes with folders of other users. Created on first use and removed when
 * the process exits. A promise, so concurrent first requests share one folder.
 */
let directoryReady: Promise<string> | undefined;
let directory: string | undefined;

function ensureDirectory(): Promise<string> {
  directoryReady ??= mkdtemp(join(tmpdir(), "import-images-")).then((path) => {
    directory = path;
    process.once("exit", () => rmSync(path, { recursive: true, force: true }));
    return path;
  });
  return directoryReady;
}

/** For tests: use another folder, or `undefined` for the default. */
export function setImportImageDirectory(path: string | undefined) {
  directory = path;
  directoryReady = path === undefined ? undefined : Promise.resolve(path);
}

function imagePath(id: string) {
  return join(directory!, `${id}.jpg`);
}

async function removeExpiredImages(now = Date.now()) {
  for (const name of await readdir(directory!)) {
    const path = join(directory!, name);
    const { mtimeMs } = await stat(path).catch(() => ({ mtimeMs: now }));
    if (now - mtimeMs > MAX_AGE_MS) await rm(path, { force: true });
  }
}

/**
 * Scales an image down to at most 1000×1000 as JPEG and stores it.
 * Throws when the bytes are not an image.
 */
export async function storeImportImage(bytes: Buffer): Promise<string> {
  // Recreate the folder if the system cleaned up the temp folder meanwhile.
  await mkdir(await ensureDirectory(), { recursive: true });
  await removeExpiredImages();
  let jpeg: Buffer;
  try {
    jpeg = await sharp(bytes)
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch {
    throw new Error("Het bestand is geen leesbare afbeelding");
  }
  const id = randomUUID();
  await writeFile(imagePath(id), jpeg);
  return `${IMPORT_IMAGE_PREFIX}${id}`;
}

/** Ids of the stored images referenced in HTML. */
export function findImportImageIds(html: string): string[] {
  return [
    ...new Set(Array.from(html.matchAll(referencePattern), (m) => m[1]!)),
  ];
}

export function importImageExists(id: string): boolean {
  // Without a folder no image has been stored by this process yet.
  return directory !== undefined && existsSync(imagePath(id));
}

/**
 * Replaces image references with data URLs. Synchronous on purpose: it runs
 * inside the database transaction of the import.
 */
export function resolveImportImages(html: string): string {
  return html.replace(referencePattern, (_, id: string) => {
    const base64 = readFileSync(imagePath(id)).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  });
}

export async function removeImportImages(ids: Iterable<string>) {
  if (directory === undefined) return;
  for (const id of ids) await rm(imagePath(id), { force: true });
}
