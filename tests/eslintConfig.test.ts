import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint();

// Load Nuxt's generated configuration before the individual rule assertions.
beforeAll(async () => {
  await eslint.calculateConfigForFile("app/utils/example.ts");
  await eslint.lintText("export const value = 1;", {
    filePath: "shared/types/Issue.ts",
  });
}, 60000);

async function ruleIds(code: string, filePath: string) {
  // Typed linting requires a path included in its TypeScript program.
  if (filePath.startsWith("shared/")) filePath = "shared/types/Issue.ts";
  const results = await eslint.lintText(code, { filePath });
  return results.flatMap((result) =>
    result.messages.map((message) => message.ruleId),
  );
}

describe("repository lint policy", () => {
  it.each([
    "// @ts-nocheck",
    "// @ts-expect-error",
    "// @ts-expect-error: short",
  ])("rejects undocumented or unlimited suppression: %s", async (comment) => {
    expect(
      await ruleIds(
        `${comment}\nexport const value: string = 1;`,
        "scripts/example.ts",
      ),
    ).toContain("@typescript-eslint/ban-ts-comment");
  });
  it.each([
    ['import { getDb } from "~~/server/utils/db";', "app/utils/example.ts"],
    ['export { getDb } from "../../server/utils/db";', "app/utils/example.ts"],
    ['import { getDb } from "#server/utils/db";', "app/utils/example.ts"],
    ['import fs from "node:fs";', "shared/example.ts"],
    ['import { readBody as read } from "h3";', "app/utils/example.ts"],
    ['export { default as mail } from "nodemailer";', "shared/example.ts"],
    ['import fs from "fs/promises";', "app/utils/example.ts"],
    ['import { useState } from "#imports";', "shared/example.ts"],
    ['import value from "../app/utils/example";', "shared/example.ts"],
    [
      '<script setup lang="ts">import fs from "node:fs";</script>',
      "app/components/Example.vue",
    ],
  ])(
    "rejects runtime boundary violations in %s (%s)",
    async (code, filePath) => {
      expect(await ruleIds(code, filePath)).toContain("no-restricted-imports");
    },
  );

  it.each([
    [
      'import type { Legend } from "~~/server/database/schema";',
      "app/utils/example.ts",
    ],
    ['import type { Issue } from "./types/Issue";', "shared/example.ts"],
    ['import type { H3Event } from "h3";', "app/utils/example.ts"],
    ['import { click } from "ol/events/condition";', "app/utils/example.ts"],
    ['import fs from "node:fs";', "scripts/example.ts"],
    ['import fs from "node:fs";', "server/utils/example.ts"],
  ])("allows legitimate imports in %s (%s)", async (code, filePath) => {
    expect(await ruleIds(code, filePath)).not.toContain(
      "no-restricted-imports",
    );
  });

  it.each([
    [
      "export const result = Promise.resolve(1); result;",
      "@typescript-eslint/no-floating-promises",
    ],
    [
      "declare function consume(callback: () => void): void; consume(async () => { await Promise.resolve(); });",
      "@typescript-eslint/no-misused-promises",
    ],
    [
      "export const result: unknown = JSON.parse('{}'); const value = JSON.parse('{}'); export { value };",
      "@typescript-eslint/no-unsafe-assignment",
    ],
    [
      "export const result: unknown = JSON.parse('{}').payload;",
      "@typescript-eslint/no-unsafe-member-access",
    ],
  ])("rejects typed boundary misuse: %s", async (code, ruleId) => {
    expect(await ruleIds(code, "shared/types/Issue.ts")).toContain(ruleId);
  });

  it("accepts handled promises and unknown JSON at the shared boundary", async () => {
    const rules = await ruleIds(
      "export async function decode() { await Promise.resolve(); const value: unknown = JSON.parse('{}'); return value; }",
      "shared/types/Issue.ts",
    );
    expect(
      rules.filter(
        (rule) =>
          rule?.startsWith("@typescript-eslint/no-unsafe") ||
          rule === "@typescript-eslint/no-floating-promises" ||
          rule === "@typescript-eslint/no-misused-promises",
      ),
    ).toEqual([]);
  });

  it.each([
    "app/utils/example.ts",
    "server/utils/example.ts",
    "shared/example.ts",
    "tests/example.test.ts",
    "scripts/example.ts",
    "e2e/example.ts",
    "eslint-rules/example.ts",
  ])("checks TypeScript policy in %s", async (filePath) => {
    expect(await ruleIds("export const value: any = 1;", filePath)).toContain(
      "@typescript-eslint/no-explicit-any",
    );
    expect(
      await ruleIds(
        "// @ts-ignore: a sufficiently long explanation\nexport const value = 1;",
        filePath,
      ),
    ).toContain("@typescript-eslint/ban-ts-comment");
    expect(
      await ruleIds(
        "// @ts-expect-error: intentional invalid input for validation\nexport const value: string = 1;",
        filePath,
      ),
    ).not.toContain("@typescript-eslint/ban-ts-comment");
  });
});
