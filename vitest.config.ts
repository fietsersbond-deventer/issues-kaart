import { configDefaults, defineConfig } from "vitest/config";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import { createRequire } from "node:module";

const resolveFromNuxt = createRequire(
  createRequire(import.meta.url).resolve("nuxt/package.json"),
);

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "test-nuxt-client-flag",
      transform(code, id) {
        if (!id.includes("/app/") || !code.includes("import.meta.client")) return;
        // Nuxt normally replaces this flag. Match the selected node/jsdom environment.
        return code.replaceAll(
          "import.meta.client",
          '(typeof window !== "undefined")',
        );
      },
    },
  ],
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: [
        "app/**/*.{ts,vue}",
        "server/**/*.{ts,js}",
        "shared/**/*.ts",
        "scripts/**/*.ts",
      ],
      // These files contain declarations only; executable shared guards stay included.
      exclude: [
        "**/*.d.ts",
        "server/database/schema.ts",
        "shared/types/{Legend,Tag,Text,User}.ts",
        "app/types/LayerConfig.ts",
      ],
      reporter: ["text", "html", "json", "json-summary"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
    // Transform OpenLayers imports and Vuetify CSS in real library integration tests.
    server: { deps: { inline: ["vue3-openlayers", "vuetify"] } },
  },
  resolve: {
    alias: {
      "#imports": resolve(import.meta.dirname, "tests/helpers/nuxt.ts"),
      "#components": resolve(import.meta.dirname, "tests/helpers/nuxt.ts"),
      "vue-router": resolveFromNuxt.resolve("vue-router"),
      "~~": resolve(import.meta.dirname, "."),
      "~": resolve(import.meta.dirname, "app"),
      "@": resolve(import.meta.dirname, "app"),
    },
  },
});
