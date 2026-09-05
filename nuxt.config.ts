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
  content: {
    experimental: { sqliteConnector: "native" },
  },
  modules: [
    "@nuxt/eslint",
    "@sidebase/nuxt-auth",
    "nuxt-mdi",
    "vuetify-nuxt-module",
    "@pinia/nuxt",
    "@jfungus/ratelimit-nuxt",
    // "nuxt-security",
    "nuxt-db-migrations",
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
  ratelimit: {
    limit: 100,
    windowMs: 60000, // 1 minute in milliseconds
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
      /* module specific options */
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
    server: {
      allowedHosts: true,
    },
  },
  dbMigrations: {
    dir: "./server/database/migrations",
    autoMigrate: true,
    table: "_hub_migrations",
    lockTimeout: 30000,
    baseline: "0001_initial_schema.sql",
  },
});
