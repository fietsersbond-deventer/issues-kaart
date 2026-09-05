import { defineNitroPlugin } from "#imports";
export default defineNitroPlugin(async () => {
  console.log("[nuxt-db-migrations] Auto-migrate plugin loaded");
  try {
  } catch (error) {
    console.error("[nuxt-db-migrations] Auto-migration failed:", error);
    throw error;
  }
});
