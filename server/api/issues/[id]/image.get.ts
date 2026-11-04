import { createHash } from "node:crypto";
import sharp from "sharp";
import { getDb } from "~~/server/utils/db";
import { extractImageUrl } from "~~/server/utils/extractImageUrl";

const minDimension = 16;
const maxDimension = 4000;
const minBytes = 5_000;
const maxBytesLimit = 5_000_000;
const qualities = [85, 75, 65, 55, 45, 35, 25, 15, 5, 1];

function parseLimit(value: unknown, min: number, max: number): number | undefined {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Serveert de afbeelding van een onderwerp.
 * Zonder queryparameters wordt het origineel teruggegeven. Met `width`, `height`
 * en/of `maxBytes` wordt een kleinere JPEG gemaakt (thumbnail, og-image), die
 * per parametercombinatie in de Nitro-cache terechtkomt.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Issue ID is required",
    });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT description FROM issues WHERE id = ?")
    .get(id) as { description: string } | undefined;

  if (!row) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${id} not found`,
    });
  }

  // Extract the image data URL from the description
  const dataUrl = extractImageUrl(row.description);

  if (!dataUrl) {
    throw createError({
      statusCode: 404,
      message: `No image found for issue ${id}`,
    });
  }

  // Parse the data URL to extract mime type and base64 data
  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/);

  if (!match) {
    throw createError({
      statusCode: 500,
      message: `Invalid image data format for issue ${id}`,
    });
  }

  const query = getQuery(event);
  const width = parseLimit(query.width, minDimension, maxDimension);
  const height = parseLimit(query.height, minDimension, maxDimension);
  const maxBytes = parseLimit(query.maxBytes, minBytes, maxBytesLimit);
  const source = Buffer.from(match[2]!, "base64");

  if (!width && !height && !maxBytes) {
    setResponseHeader(event, "Content-Type", match[1]!);
    setResponseHeader(event, "Cache-Control", "public, max-age=3600");
    return source;
  }

  // De ETag omvat de bron en de uitvoerinstellingen.
  const etag = `"${createHash("sha256")
    .update(`jpeg-inside-${width ?? ""}x${height ?? ""}-${maxBytes ?? ""}-v1:`)
    .update(dataUrl)
    .digest("hex")}"`;
  setResponseHeader(event, "ETag", etag);
  setResponseHeader(event, "Cache-Control", "public, max-age=0, must-revalidate");
  if (getHeader(event, "if-none-match")?.split(",").some((value) =>
    value.trim().replace(/^W\//, "") === etag || value.trim() === "*",
  )) {
    setResponseStatus(event, 304);
    return;
  }

  let resized: Buffer;
  try {
    resized = await sharp(source, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(width, height, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
  } catch (error) {
    console.error("Afbeelding verwerken mislukt:", error);
    throw createError({ statusCode: 500, message: "Afbeelding kon niet worden verwerkt" });
  }

  // Verlaag de JPEG-kwaliteit totdat de bytegrens gehaald is.
  for (const quality of maxBytes ? qualities : qualities.slice(0, 1)) {
    const result = await sharp(resized).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (!maxBytes || result.length <= maxBytes) {
      setResponseHeader(event, "Content-Type", "image/jpeg");
      setResponseHeader(event, "Content-Length", result.length);
      return result;
    }
  }
  throw createError({ statusCode: 500, message: "Afbeelding overschrijdt de maximale bestandsgrootte" });
});
