import { defineConfig } from "vitest/config";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "~~": resolve(import.meta.dirname, "."),
      "~": resolve(import.meta.dirname, "."),
      "@": resolve(import.meta.dirname, "."),
    },
  },
});
