import { createHash } from "node:crypto";
import sharp from "sharp";
import { getDb } from "../../../utils/db";
import { extractImageUrl } from "../../../utils/extractImageUrl";

const maxBytes = 1_000_000;

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "Onderwerp-ID is verplicht" });
  }
  const row = getDb()
    .prepare("SELECT description FROM issues WHERE id = ?")
    .get(id);
  if (!row) {
    throw createError({ statusCode: 404, message: "Onderwerp niet gevonden" });
  }
  const dataUrl = extractImageUrl(
    typeof row.description === "string" ? row.description : null,
  );
  if (!dataUrl) {
    throw createError({ statusCode: 404, message: "Onderwerp heeft geen afbeelding" });
  }
  const match = dataUrl.match(/^data:image\/[^;]+;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match?.[1]) {
    throw createError({ statusCode: 500, message: "Ongeldig afbeeldingsformaat" });
  }

  // De versie omvat de bron en de uitvoerinstellingen. Hergebruik is alleen
  // toegestaan na controle, zodat wijzigingen op dezelfde URL zichtbaar worden.
  const etag = `"${createHash("sha256").update("og-jpeg-inside-1200x630-v2:").update(dataUrl).digest("hex")}"`;
  setResponseHeader(event, "ETag", etag);
  setResponseHeader(event, "Cache-Control", "public, max-age=0, must-revalidate");
  if (getHeader(event, "if-none-match")?.split(",").some((value) =>
    value.trim().replace(/^W\//, "") === etag || value.trim() === "*",
  )) {
    setResponseStatus(event, 304);
    return;
  }

  let image: Buffer;
  try {
    image = await sharp(Buffer.from(match[1], "base64"), {
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(1200, 630, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
  } catch (error) {
    console.error("Socialmedia-afbeelding verwerken mislukt:", error);
    throw createError({ statusCode: 500, message: "Afbeelding kon niet worden verwerkt" });
  }

  // Verlaag de JPEG-kwaliteit totdat ook de bytegrens aantoonbaar gehaald is.
  for (const quality of [85, 75, 65, 55, 45, 35, 25, 15, 5, 1]) {
    const result = await sharp(image).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (result.length <= maxBytes) {
      setResponseHeader(event, "Content-Type", "image/jpeg");
      setResponseHeader(event, "Content-Length", result.length);
      return result;
    }
  }
  throw createError({ statusCode: 500, message: "Afbeelding overschrijdt de maximale bestandsgrootte" });
});
