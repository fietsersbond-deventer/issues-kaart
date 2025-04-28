// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-04-25",
  future: { compatibilityVersion: 4 },
  css: ["@/assets/css/main.css"],
  modules: [
    "@nuxthub/core",
    "@nuxt/eslint",
    "@sidebase/nuxt-auth",
    "@nuxtjs/leaflet",
    "@nuxt/ui",
  ],
  hub: {
    database: true,
    kv: false,
    blob: false,
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
        },
      },
      endpoints: {
        signIn: { path: "/api/auth/login", method: "post" },
        signOut: { path: "/api/auth/logout", method: "post" },
        signUp: { path: "/api/auth/register", method: "post" },
        getSession: { path: "/api/auth/session", method: "get" },
      },
    },
  },
  nitro: {
    experimental: {
      openAPI: true,
    },
  },
  devtools: { enabled: true },
});
