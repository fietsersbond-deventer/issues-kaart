import { defineNuxtPlugin, useRoute, useRuntimeConfig, watch } from "#imports";
import { useDebounceFn } from "@vueuse/core";

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

  const { currentTitle } = useTitle("");

  // we krijgen het zetten van de title niet goed onder de knie
  // bij nieuw issue 3 updates ??
  // - undefined
  // - oude titel
  // - nieuwe titel
  const debounced = useDebounceFn((title: string) => {
    window._paq.push(["setDocumentTitle", title]);
    window._paq.push(["setCustomUrl", route.fullPath]);
    window._paq.push(["trackPageView"]);
  }, 500);

  // Update title in Matomo when it changes (for dynamic pages like [id].vue)
  watch(
    currentTitle,
    (newTitle) => {
      debounced(newTitle as string);
    },
    { immediate: true }
  );
});
