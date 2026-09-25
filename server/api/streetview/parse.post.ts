import {
  buildEmbedPbUrl,
  buildStreetViewThumbnailUrl,
  fetchThumbnailAsDataUrl,
  parseStreetViewUrl,
  resolveShareLink,
} from "~~/server/utils/streetView";

/**
 * Verwerkt een geplakte Google Maps Street View deel-link en haalt eenmalig,
 * server-side, een statische voorvertoning op.
 *
 * Alleen-lezen endpoint: er wordt hier NIETS in de database opgeslagen. Pas
 * wanneer de gebruiker het onderwerp zelf opslaat (via de bestaande
 * create/update-flow van issues), komt deze data terecht in de omschrijving.
 * Vereist een ingelogde gebruiker (requireUserSession), zodat dit endpoint
 * niet misbruikt kan worden als open "URL-fetch-proxy" door anonieme
 * bezoekers.
 */
export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const { url } = await readBody<{ url?: string }>(event);
  if (!url || typeof url !== "string") {
    throw createError({
      statusCode: 400,
      message: "Een Street View link is verplicht",
    });
  }

  try {
    // Stap 1: volg eventuele redirects van een verkorte deel-link naar de
    // volledige, echte Google Maps-URL (met SSRF-bescherming, zie streetView.ts).
    const resolvedUrl = await resolveShareLink(url);
    // Stap 2: haal lat/lng/heading/pitch/fov/panoId uit die URL.
    const params = parseStreetViewUrl(resolvedUrl);
    // Stap 3: bouw de URL voor Google's (niet-gedocumenteerde) thumbnail-dienst.
    const thumbnailUrl = buildStreetViewThumbnailUrl(
      params.panoId,
      params.heading,
      params.pitch,
    );
    // Stap 4: haal die thumbnail-afbeelding NU al één keer op (server-side) en
    // zet 'm om naar een data-URL, zodat de bezoeker van de kaart later nooit
    // zelf contact hoeft te maken met Google om de voorvertoning te zien.
    const previewDataUrl = await fetchThumbnailAsDataUrl(thumbnailUrl);
    // Stap 5: bouw alvast de embed-URL die pas gebruikt wordt als de bezoeker
    // straks daadwerkelijk op de voorvertoning klikt (live, interactieve Street
    // View - dát moment is de bewuste, expliciete actie van de bezoeker zelf).
    const embedSrc = buildEmbedPbUrl(params);

    return {
      ...params,
      previewDataUrl,
      embedSrc,
    };
  } catch (error) {
    // Alle fouten hierboven (ongeldige link, geen Street View-positie,
    // geweigerde host, etc.) hebben al een duidelijke Nederlandstalige
    // boodschap - die geven we hier gewoon door aan de gebruiker.
    throw createError({
      statusCode: 400,
      message:
        error instanceof Error
          ? error.message
          : "Kon de Street View link niet verwerken",
    });
  }
});
