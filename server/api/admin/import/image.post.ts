import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { downloadImage, MAX_IMAGE_BYTES } from "~~/server/utils/downloadImage";
import { storeImportImage } from "~~/server/utils/importImages";

/**
 * Processes one image for the import and returns a reference to it.
 * - JSON `{ url }`: downloads a remote image (the browser cannot, due to CORS).
 * - An `image/*` body: an image from a KMZ archive.
 * The image is scaled down and kept on the server until the import.
 */
export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  let bytes: Buffer;
  try {
    if (getHeader(event, "content-type")?.startsWith("image/")) {
      const body = await readRawBody(event, false);
      if (!body?.length) throw new Error("Lege afbeelding");
      if (body.length > MAX_IMAGE_BYTES) {
        throw new Error("Afbeelding is groter dan 50 MB");
      }
      bytes = Buffer.from(body);
    } else {
      const { url } = (await readBody<{ url?: unknown }>(event)) ?? {};
      if (typeof url !== "string" || !url.trim()) {
        throw createError({ statusCode: 400, message: "URL is verplicht" });
      }
      bytes = await downloadImage(url.trim());
    }
    return { ref: await storeImportImage(bytes) };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw createError({
      statusCode: 422,
      message: error instanceof Error ? error.message : "Verwerken mislukt",
    });
  }
});
