import { defineConfig } from "vitest/config";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "node",
    globals: true,
    // Transform the library's extensionless imports for real OpenLayers integration tests.
    server: { deps: { inline: ["vue3-openlayers"] } },
  },
  resolve: {
    alias: {
      "~~": resolve(import.meta.dirname, "."),
      "~": resolve(import.meta.dirname, "."),
      "@": resolve(import.meta.dirname, "."),
    },
  },
});
