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

  // Update title in Matomo when it changes (for dynamic pages like [id].vue)
  watch(
    () => route.meta.title,
    (newTitle) => {
      window._paq.push(["setDocumentTitle", newTitle]);
      window._paq.push(["setCustomUrl", route.fullPath]);
      window._paq.push(["trackPageView"]);
    },
    { immediate: true }
  );
});
