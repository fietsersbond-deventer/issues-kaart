import { defineNuxtPlugin, useRoute, useRuntimeConfig, watch } from "#imports";

declare global {
  interface Window {
    _paq: [string, ...unknown[]][];
  }
}

export default defineNuxtPlugin(() => {
  const route = useRoute();
  const {
    public: { matomo },
    matomo: matomoServer,
  } = useRuntimeConfig();

  // Controleer of Matomo volledig is geconfigureerd
  // Zowel client-side (siteId) als server-side (url) moet aanwezig zijn
  if (!matomo?.siteId) {
    console.debug("Matomo tracking is disabled - missing site ID");
    return;
  }

  if (!matomoServer?.url) {
    console.debug("Matomo tracking is disabled - missing server configuration");
    return;
  }

  window._paq = window._paq || [];

  const trackerUrl = "/api/profile";
  const scriptUrl = "/api/profile/script";

  window._paq.push(["setTrackerUrl", trackerUrl]);
  window._paq.push(["setRequestMethod", "POST"]);
  window._paq.push(["setSiteId", matomo.siteId]);

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptUrl;

  // Fout handler voor het script
  script.onerror = () => {
    console.warn(
      "Failed to load Matomo tracking script - Matomo may not be properly configured"
    );
  };

  document.head.appendChild(script);

  window._paq.push(["trackPageView"]);

  watch(
    () => route.fullPath,
    (path) => {
      window._paq.push(["setCustomUrl", path]);
      window._paq.push(["trackPageView"]);
    }
  );
});
