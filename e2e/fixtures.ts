import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { seedDatabase, password } from "./seed.js";
import { runtime } from "./support/runtime.js";
import { isolateExternalServices } from "./support/network.js";
import { createPages, type Pages } from "./pages/index.js";

export const test = base.extend<{
  isolatedData: undefined;
  app: Pages;
  secondUser: () => Promise<Pages & { context: BrowserContext; page: Page }>;
}>({
  isolatedData: [
    async ({ context }, use) => {
      const state = runtime();
      const db = new DatabaseSync(state.dbPath);
      try {
        seedDatabase(db);
      } finally {
        db.close();
      }
      writeFileSync(state.mailFile, "");
      await isolateExternalServices(context);
      await use(undefined);
    },
    { auto: true },
  ],
  app: async ({ page }, use) => {
    await use(createPages(page));
  },
  secondUser: async ({ browser, baseURL }, use) => {
    const contexts: BrowserContext[] = [];
    try {
      await use(async () => {
        const context = await browser.newContext({
          baseURL,
          serviceWorkers: "block",
        });
        contexts.push(context);
        await isolateExternalServices(context);
        const page = await context.newPage();
        const pages = createPages(page);
        await pages.loginPage.login("admin@example.test");
        return { context, page, ...pages };
      });
    } finally {
      for (const context of contexts) await context.close();
    }
  },
});
export { expect, password };
