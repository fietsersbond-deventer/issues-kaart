/**
 * Matomo proxy endpoint
 * This endpoint proxies requests to Matomo, bypassing CORS restrictions
 * Client requests to /api/track are forwarded to the configured Matomo server
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const matomoUrl = config.matomo?.url;

  // Check required configuration
  if (!matomoUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: "Matomo URL is not configured",
    });
  }

  if (!config.matomo?.authToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "Matomo auth token is not configured. Set MATOMO_AUTH_TOKEN in your environment.",
    });
  }

  try {
    const body = await readBody(event);
    const query = getQuery(event);

    // Build the Matomo tracker URL
    const trackerUrl = config.matomo?.trackerUrl;
    const targetUrl = trackerUrl?.startsWith('http')
      ? trackerUrl
      : `${matomoUrl.replace(/\/$/, "")}/${trackerUrl || "matomo.php"}`;

    // Voeg auth token toe aan de parameters (we weten dat die bestaat door de check hierboven)
    const params = {
      ...body,
      ...query,
      token_auth: config.matomo.authToken
    };

    // Forward the request to Matomo
    const response = await $fetch(targetUrl, {
      method: "POST",
      // Matomo verwacht form-urlencoded data, geen JSON
      body: new URLSearchParams(params).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": event.node.req.headers["user-agent"] || "",
        "Referer": event.node.req.headers["referer"] || "",
      },
    });

    return response;
  } catch (error) {
    console.error("[Matomo Proxy] Error forwarding request:", error);
    // Log de volledige error voor debugging
    console.error(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to proxy Matomo request",
      cause: error,
    });
  }
});
