import { transformAssetUrls } from "vite-plugin-vuetify";

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
    public: {
      adminName: process.env.ADMIN_NAME || "Admin",
      locationName: process.env.LOCATION_NAME || "Deventer",
      locationBounds: {
        west: parseFloat(process.env.LOCATION_BOUNDS_WEST || "6.0"),
        south: parseFloat(process.env.LOCATION_BOUNDS_SOUTH || "52.1"),
        east: parseFloat(process.env.LOCATION_BOUNDS_EAST || "6.3"),
        north: parseFloat(process.env.LOCATION_BOUNDS_NORTH || "52.4"),
      },
      locationMinBbox: {
        west: parseFloat(process.env.LOCATION_MIN_BBOX_WEST || "6.1109776821179045"),
        south: parseFloat(process.env.LOCATION_MIN_BBOX_SOUTH || "52.23674680068737"),
        east: parseFloat(process.env.LOCATION_MIN_BBOX_EAST || "6.224405294943567"),
        north: parseFloat(process.env.LOCATION_MIN_BBOX_NORTH || "52.29330327072566"),
      },
    },
    isProduction: process.env.NODE_ENV === "production",
  },
  modules: [
    "@nuxthub/core",
    "@nuxt/eslint",
    "@sidebase/nuxt-auth",
    "nuxt-mdi",
    "vuetify-nuxt-module",
    "@pinia/nuxt",
  ],
  hub: {
    database: true,
    blob: false,
    kv: false,
    cache: false,
  },
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
  },
  nitro: {
    experimental: {
      openAPI: true,
    },
  },
  devtools: { enabled: true },
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: {
      /* vuetify options */
    },
  },
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
});
