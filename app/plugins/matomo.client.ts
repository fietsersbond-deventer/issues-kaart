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
  } = useRuntimeConfig();

  // Controleer of Matomo volledig is geconfigureerd
  if (!matomo?.siteId) {
    console.debug("Matomo tracking is disabled - missing site ID");
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
    console.error(
      "Failed to load Matomo tracking script - Matomo may not be properly configured on the server"
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
