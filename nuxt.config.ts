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
    "@/assets/css/main.css"  // Make sure our CSS is last to take precedence
  ],
  runtimeConfig: {
    public: {
      tinymceApiKey: "", // Add your TinyMCE API key in .env file
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
    "@vueuse/nuxt",
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