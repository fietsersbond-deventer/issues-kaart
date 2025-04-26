// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-04-25",
  future: { compatibilityVersion: 4 },
  modules: ["@nuxthub/core", "@nuxt/eslint", "@sidebase/nuxt-auth"],
  hub: {
    database: true,
    kv: true,
    blob: true,
    cache: true,
  },
  auth: {
    baseURL: process.env.AUTH_ORIGIN,
    provider: {
      type: "local",
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
