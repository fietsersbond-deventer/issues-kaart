import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// nuxt prepare (also run by pnpm install) generates the actual import registry.
const declarations = readFileSync(new URL("../.nuxt/types/imports.d.ts", import.meta.url), "utf8");

describe("Nuxt-auto-imports", () => {
  it("houdt Nuxt-layouts en Vuetify-layouts onder afzonderlijke namen beschikbaar", () => {
    expect(declarations).toMatch(/const useLayout: typeof import\('[^']*composables\/layout'\)\.useLayout/);
    expect(declarations).toMatch(/const useVLayout: typeof import\('vuetify'\)\.useLayout/);
  });

  it("registreert Vue-functies en Vuetify-scherminformatie", () => {
    expect(declarations).toMatch(/const ref: typeof import\('vue'\)\.ref/);
    expect(declarations).toMatch(/const useV?Display: typeof import\('vuetify'\)\.useDisplay/);
  });
});
