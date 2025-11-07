/**
 * Matomo script proxy endpoint
 * This endpoint proxies requests for the Matomo tracking script
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const matomoUrl = config.matomo?.url;
  const matomoScriptUrl = config.matomo?.scriptUrl;
  const matomoAuthToken = config.matomo?.authToken;

  // Controleer of alle vereiste configuratie aanwezig is
  if (!matomoUrl) {
    console.error("[Matomo Script Proxy] Error: Matomo URL is not configured");
    throw createError({
      statusCode: 400,
      statusMessage: "Matomo is not configured - missing URL",
    });
  }

  if (!matomoAuthToken) {
    console.error(
      "[Matomo Script Proxy] Error: Matomo auth token is not configured"
    );
    throw createError({
      statusCode: 400,
      statusMessage: "Matomo is not configured - missing auth token",
    });
  }

  try {
    const scriptPath = matomoScriptUrl || "matomo.js";
    const targetUrl = `${matomoUrl.replace(/\/$/, "")}/${scriptPath}`;

    // Fetch the Matomo script with detailed error handling
    const response = await $fetch(targetUrl, {
      method: "GET",
      timeout: 10000,
    }).catch((err) => {
      console.error("[Matomo Script Proxy] Fetch failed:", err.message);
      throw err;
    });

    // Set appropriate headers
    setHeader(event, "Content-Type", "application/javascript");
    setHeader(event, "Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    return response;
  } catch (error) {
    console.error("[Matomo Script Proxy] Error fetching script:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch Matomo script",
    });
  }
});
