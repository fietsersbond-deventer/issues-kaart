import { useEventListener } from "@vueuse/core";

export default defineNuxtPlugin((nuxtApp) => {
  const viewportWidth = useCookie<number | null>("viewport-width", {
    default: () => null,
    sameSite: "lax",
    path: "/",
  });
  const headers = useRequestHeaders(["user-agent", "sec-ch-ua-mobile"]);

  nuxtApp.hook("vuetify:ssr-client-hints", ({ vuetifyOptions, ssrClientHints }) => {
    let clientWidth = ssrClientHints.viewportWidth;
    if (typeof clientWidth !== "number" || !Number.isFinite(clientWidth) || clientWidth <= 0) {
      const savedWidth = viewportWidth.value;
      const mobile =
        headers["sec-ch-ua-mobile"] === "?1" ||
        (headers["sec-ch-ua-mobile"] !== "?0" &&
          /Mobile|iPhone|iPod/i.test(headers["user-agent"] ?? ""));
      clientWidth =
        typeof savedWidth === "number" && Number.isInteger(savedWidth) && savedWidth > 0
          ? savedWidth
          : mobile ? 390 : 1280;
    }

    // The module serializes these hints so the client starts at the same width.
    ssrClientHints.viewportWidth = clientWidth;
    vuetifyOptions.ssr = {
      clientWidth,
      clientHeight: ssrClientHints.viewportHeight,
    };
  });

  if (import.meta.client) {
    const rememberWidth = () => {
      viewportWidth.value = window.innerWidth;
    };
    nuxtApp.hook("app:mounted", rememberWidth);
    useEventListener(window, "resize", rememberWidth);
  }
});
