import { transformAssetUrls } from "vite-plugin-vuetify";
import { nl } from "vuetify/locale";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-04-25",
  future: { compatibilityVersion: 4 },
  ssr: false,
  app: {
    head: {
      link: [{ rel: "icon", type: "image/jpeg", href: "/fietsersbond.jpeg" }],
      htmlAttrs: {
        lang: "nl",
      },
    },
  },
  css: [
    "ol/ol.css",
    "vue3-openlayers/vue3-openlayers.css",
    "@/assets/css/main.css", // Make sure our CSS is last to take precedence
  ],
  runtimeConfig: {
    matomo: {
      // Basis configuratie - leeg betekent Matomo is uitgeschakeld
      url: process.env.MATOMO_URL,
      // Server-side paths
      trackerUrl: process.env.MATOMO_TRACKER_URL,
      scriptUrl: process.env.MATOMO_SCRIPT_URL,
      // Auth token voor API toegang
      authToken: process.env.MATOMO_AUTH_TOKEN,
    },
    nodemailer: {
      host: process.env.NUXT_NODEMAILER_HOST,
      port: Number(process.env.NUXT_NODEMAILER_PORT) || 587,
      secure: process.env.NUXT_NODEMAILER_SECURE === "true",
      auth: {
        user: process.env.NUXT_NODEMAILER_AUTH_USER,
        pass: process.env.NUXT_NODEMAILER_AUTH_PASSWORD,
      },
      from: process.env.NUXT_NODEMAILER_FROM,
    },
    public: {
      adminName: "",
      // Organisatie configuratie
      organization: {
        name: "",
        shortName: "",
        website: "",
        contactUrl: "",
        githubRepoUrl: "",
      },
      // Kaart configuratie
      map: {
        centerLat: "",
        centerLon: "",
        initialZoom: "",
        searchBbox: "",
      },
      matomo: {
        siteId: "",
      },
    },
    isProduction: process.env.NODE_ENV === "production",
  },
  modules: [
    "@nuxt/eslint",
    "@sidebase/nuxt-auth",
    "vuetify-nuxt-module",
    "@pinia/nuxt",
    "nuxt-nodemailer",
    "@nuxt/icon",
  ],
  auth: {
    baseURL: process.env.AUTH_ORIGIN,
    provider: {
      type: "local",
      session: {
        // hiervan wordt de typescript SessionData type gegenereerd
        dataType: {
          id: "string",
          username: "string",
          name: "string",
          role: "string",
        },
      },
      endpoints: {
        signIn: { path: "/login", method: "post" },
        signOut: { path: "/logout", method: "post" },
        getSession: { path: "/session", method: "get" },
      },
      refresh: {
        isEnabled: true,
        endpoint: { path: "/refresh", method: "post" },
      },
    },
    sessionRefresh: {
      enableOnWindowFocus: false,
    },
  },
  nitro: {
    experimental: {
      openAPI: true,
      websocket: true,
    },
  },
  // security: {
  //   headers: {
  //     contentSecurityPolicy: {
  //       "default-src": ["'self'"],
  //       "script-src": ["'self'"],
  //       "style-src": [
  //         "'self'",
  //         "'unsafe-inline'",
  //         "https://fonts.googleapis.com",
  //       ],
  //       "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  //       "img-src": [
  //         "'self'",
  //         "data:",
  //         "blob:",
  //         "https://*.global.ssl.fastly.net",
  //         "https://*.tile-cyclosm.openstreetmap.fr",
  //         "https://service.pdok.nl",
  //       ],
  //       "connect-src": [
  //         "'self'",
  //         "https://photon.komoot.io",
  //         "https://nominatim.openstreetmap.org",
  //         "https://service.pdok.nl",
  //       ],
  //       "worker-src": ["'self'", "blob:"],
  //       "frame-ancestors": ["'none'"],
  //       "base-uri": ["'self'"],
  //       "object-src": ["'none'"],
  //       "form-action": ["'self'"],
  //     },
  //   },
  // },
  devtools: { enabled: true },
  vuetify: {
    moduleOptions: {
      prefixComposables: true,
    },
    vuetifyOptions: {
      /* vuetify options */
      locale: {
        locale: "nl",
        fallback: "en",
        messages: { nl },
      },
      display: {
        mobileBreakpoint: "sm",
      },
      theme: {
        defaultTheme: "light",
        themes: {
          light: {
            colors: {
              primary: "#000000",
              secondary: "#afaeae",
              accent: "#82B1FF",
              error: "#FF5252",
              info: "#2196F3",
              success: "#4CAF50",
              warning: "#FFC107",
            },
          },
        },
      },
    },
  },
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
    optimizeDeps: {
      include: [
        "@turf/bbox",
        "@turf/helpers",
        "@turf/union",
        "@vueup/vue-quill",
        "@vueuse/core",
        "color",
        "mitt",
        "ol",
        "ol/control",
        "ol/easing",
        "ol/events/condition",
        "ol/format",
        "ol/geom",
        "ol/proj",
        "ol/proj/Projection",
        "ol/proj/proj4.js",
        "ol/style",
        "proj4",
        "quill-image-compress", // CJS
        "vue3-openlayers",
      ],
    },

    server: {
      allowedHosts: true,
    },
  },
});
