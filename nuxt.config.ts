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
    },
  },
  css: [
    "ol/ol.css",
    "vue3-openlayers/dist/vue3-openlayers.css",
    "@/assets/css/main.css", // Make sure our CSS is last to take precedence
  ],
  runtimeConfig: {
    matomo: {
      // Basis configuratie - leeg betekent Matomo is uitgeschakeld
      url: process.env.MATOMO_URL || "",
      // Server-side paths
      trackerUrl: process.env.MATOMO_TRACKER_URL || "",
      scriptUrl: process.env.MATOMO_SCRIPT_URL || "",
      // Auth token voor API toegang
      authToken: process.env.MATOMO_AUTH_TOKEN || "",
    },
    public: {
      adminName: process.env.NUXT_PUBLIC_ADMIN_NAME || "Admin",
      // Organisatie configuratie
      organization: {
        name:
          process.env.NUXT_PUBLIC_ORGANIZATION_NAME || "Fietsersbond Afdeling",
        shortName:
          process.env.NUXT_PUBLIC_ORGANIZATION_SHORT_NAME || "Onderwerpen",
        website:
          process.env.NUXT_PUBLIC_ORGANIZATION_WEBSITE ||
          "https://example.fietsersbond.nl/",
        contactUrl:
          process.env.NUXT_PUBLIC_ORGANIZATION_CONTACT_URL ||
          "https://example.fietsersbond.nl/contact/",
        githubRepoUrl:
          process.env.NUXT_PUBLIC_GITHUB_REPO_URL ||
          "https://github.com/organization/repo",
      },
      // Kaart configuratie
      map: {
        centerLat: parseFloat(
          process.env.NUXT_PUBLIC_MAP_CENTER_LAT || "52.2511467"
        ),
        centerLon: parseFloat(
          process.env.NUXT_PUBLIC_MAP_CENTER_LON || "6.1574997"
        ),
        initialZoom: parseInt(process.env.NUXT_PUBLIC_MAP_INITIAL_ZOOM || "13"),
        searchBbox:
          process.env.NUXT_PUBLIC_MAP_SEARCH_BBOX || "6.0,52.1,6.3,52.4",
      },
      matomo: {
        // Alleen site ID is nodig in de client
        siteId: process.env.NUXT_PUBLIC_MATOMO_SITE_ID || "",
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
        signUp: { path: "/register", method: "post" },
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
        mobileBreakpoint: "lg",
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
});
