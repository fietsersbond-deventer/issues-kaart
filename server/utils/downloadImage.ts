/**
 * Safety limit only: images are scaled down before they are stored, but the
 * original is held in server memory while it is processed.
 */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

/**
 * Downloads an image, so it keeps working after the source (e.g. a deleted
 * Google My Maps map) is gone.
 */
export async function downloadImage(url: string): Promise<Buffer> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Ongeldige URL");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Protocol ${parsedUrl.protocol} wordt niet ondersteund`);
  }

  const response = await fetch(parsedUrl, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Downloaden mislukt (HTTP ${response.status})`);
  }

  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (!contentType || !IMAGE_TYPES.has(contentType)) {
    throw new Error(
      `Geen ondersteunde afbeelding (${contentType ?? "onbekend type"})`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Afbeelding is groter dan 50 MB");
  }
  return bytes;
}
