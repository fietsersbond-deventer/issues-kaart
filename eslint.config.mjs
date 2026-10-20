// @ts-check
import { builtinModules } from "node:module";
import withNuxt from "./.nuxt/eslint.config.mjs";

const serverImports = {
  group: ["~~/server/**", "@@/server/**", "**/server/**", "\\#server/**"],
  allowTypeImports: true,
  message:
    "Import runtime code from shared instead of server; type-only schema imports are allowed.",
};
const serverPackages = {
  regex:
    "^(?:h3|nitropack|dotenv|nodemailer|postmark|@auth/core|nuxt-nodemailer)(?:$|/)",
  allowTypeImports: true,
  message:
    "Keep server-only packages out of browser and shared runtime modules.",
};
const nodeImports = {
  regex: `^(?:node:|(?:${builtinModules.join("|")})(?:$|/))`,
  message: "Browser and shared modules cannot import Node.js built-ins.",
};

export default withNuxt(
  { ignores: ["coverage/**", "playwright-report/**", "test-results/**"] },
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    name: "project/typescript-policy",
    files: ["**/*.{ts,tsx,mts,cts,vue}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    name: "project/browser-boundaries",
    files: ["app/**/*.{ts,js,vue}", "shared/**/*.{ts,js}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [serverImports, serverPackages, nodeImports] },
      ],
    },
  },
  {
    name: "project/shared-boundaries",
    files: ["shared/**/*.{ts,js}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            serverImports,
            serverPackages,
            nodeImports,
            {
              group: [
                "~/**",
                "@/**",
                "~~/app/**",
                "@@/app/**",
                "**/app/**",
                "\\#app",
                "\\#app/**",
                "\\#imports",
              ],
              message: "Shared modules must be independent of the Nuxt app.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "project/shared-type-safety",
    files: ["shared/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
    },
  },
);
