import { getDb } from "~~/server/utils/db";
import { extractImageUrl } from "~~/server/utils/extractImageUrl";

/**
 * Endpoint to fetch just the image from an issue's description
 * Returns the actual image data with proper content-type header
 * Used for tooltips on mouseover to avoid loading all descriptions upfront
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
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw createError({
      statusCode: 500,
      message: `Invalid image data format for issue ${id}`,
    });
  }

  const mimeType = match[1]; // e.g., "image/jpeg", "image/png"
  const base64Data = match[2];

  // Convert base64 to buffer
  const imageBuffer = Buffer.from(base64Data, "base64");

  // Set appropriate headers
  setResponseHeader(event, "Content-Type", mimeType);
  setResponseHeader(event, "Cache-Control", "public, max-age=31536000"); // Cache for 1 year

  return imageBuffer;
});
