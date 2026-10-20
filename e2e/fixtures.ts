import { test as base, expect, type Page, type BrowserContext, type Browser, type APIRequestContext } from "@playwright/test";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDatabase, password } from "./seed.js";

export function runtime() {
  const state: { directory: string; dbPath: string; mailFile: string } = JSON.parse(readFileSync(".output/e2e-runtime.json", "utf8"));
  const prefix = join(realpathSync(tmpdir()), "issues-kaart-e2e-");
  if (!realpathSync(state.directory).startsWith(prefix) || dirname(state.dbPath) !== state.directory || dirname(state.mailFile) !== state.directory) {
    throw new Error("Refusing access outside disposable E2E directory");
  }
  return state;
}

export async function isolateExternalServices(context: BrowserContext) {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:3100" || !["http:", "https:"].includes(url.protocol)) {
      await route.continue();
    } else if (route.request().resourceType() === "image") {
      await route.fulfill({ status: 204, body: "" });
    } else if (url.hostname === "nominatim.openstreetmap.org") {
      await route.fulfill({ json: [] });
    } else {
      await route.abort();
    }
  });
}

export const test = base.extend<{ isolatedData: undefined }>({
  isolatedData: [async ({ context }, use) => {
    const state = runtime();
    const db = new DatabaseSync(state.dbPath);
    try { seedDatabase(db); } finally { db.close(); }
    writeFileSync(state.mailFile, "");
    await isolateExternalServices(context);
    await use(undefined);
  }, { auto: true }],
});
export { expect, password };

export async function login(page: Page, username = "user@example.test", secret = password) {
  await page.goto("/login");
  await page.getByLabel("E-mailadres of gebruikersnaam").fill(username);
  await page.getByLabel("Wachtwoord", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Uitloggen", exact: true })).toBeVisible();
}

export async function secondUser(browser: Browser) {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3100", serviceWorkers: "block" });
  await isolateExternalServices(context);
  const page = await context.newPage();
  await login(page, "admin@example.test");
  return { context, page };
}

export async function apiHeaders(request: APIRequestContext, username = "user@example.test") {
  const response = await request.post("/api/auth/login", { data: { username, password } });
  expect(response.ok()).toBeTruthy();
  const result: { token: string } = await response.json();
  return { Authorization: `Bearer ${result.token}` };
}

export async function editIssue(page: Page, id = 101) {
  await page.goto(`/kaart/${id}`);
  await expect(page.getByRole("button", { name: "Bewerken", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await expect(page.getByLabel("Titel", { exact: true })).toBeVisible();
}

export async function selectCategory(page: Page, name: string) {
  await page.getByLabel("Categorie", { exact: true }).press("Enter");
  await page.getByRole("option", { name, exact: true }).click();
}

export async function selectTag(page: Page, name: string) {
  await page.getByLabel("Tags", { exact: true }).fill(name);
  await page.getByRole("option").filter({ hasText: name }).click();
  await page.keyboard.press("Escape");
  await page.getByLabel("Titel", { exact: true }).click();
}

export async function draw(page: Page, type: "Point" | "LineString" | "Polygon", replace = false) {
  if (replace) page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: { Point: "Teken punt", LineString: "Teken lijn", Polygon: "Teken vlak" }[type], exact: true }).click();
  const viewport = page.getByTestId("issue-map").locator(".ol-viewport").first();
  await expect(viewport.locator("canvas").first()).toBeVisible();
  const box = await viewport.boundingBox();
  if (!box) throw new Error("Map has no viewport");
  const x = box.width * 0.55;
  const y = box.height * 0.5;
  await viewport.click({ position: { x, y } });
  if (type !== "Point") {
    await viewport.click({ position: { x: x + 60, y: y + 30 } });
    await viewport.dblclick({ position: { x: x + 30, y: y - 40 } });
  }
}

export async function saveIssue(page: Page, method: "POST" | "PATCH") {
  const response = page.waitForResponse((response) => response.url().includes("/api/issues") && response.request().method() === method);
  await page.getByRole("button", { name: "Opslaan", exact: true }).first().click();
  const saved = await response;
  expect(saved.ok()).toBeTruthy();
  const issue: { id: number; title: string; geometry: string; legend_id: number; tags: string[] } = await saved.json();
  await expect(page.getByRole("heading", { name: issue.title, exact: true })).toBeVisible();
  return issue;
}

// Locate the rendered red fixture point from canvas pixels, without reading Vue/Pinia state.
// Tile canvases may be cross-origin; only the readable vector canvas is relevant.
export async function renderedPoint(page: Page) {
  let result: { x: number; y: number } | null = null;
  let previous: { x: number; y: number } | null = null;
  let stable = 0;
  await expect.poll(async () => {
    result = await page.getByTestId("issue-map").evaluate((root) => {
      for (const canvas of root.querySelectorAll("canvas")) {
        if (canvas.closest(".mini-map")) continue;
        try {
          const context = canvas.getContext("2d");
          if (!context || !canvas.width || !canvas.height) continue;
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let totalX = 0, totalY = 0, count = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i]! > 200 && pixels[i + 1]! < 40 && pixels[i + 2]! < 40 && pixels[i + 3]! > 200) {
              const pixel = i / 4;
              totalX += pixel % canvas.width;
              totalY += Math.floor(pixel / canvas.width);
              count++;
            }
          }
          if (count > 20) {
            const box = canvas.getBoundingClientRect();
            return { x: box.x + totalX / count / canvas.width * box.width, y: box.y + totalY / count / canvas.height * box.height };
          }
        } catch { /* A remote background canvas cannot be read. */ }
      }
      return null;
    });
    if (result && previous && Math.hypot(result.x - previous.x, result.y - previous.y) < 0.5) stable++;
    else stable = 0;
    previous = result;
    return stable >= 2;
  }).toBe(true);
  if (!result) throw new Error("No rendered point");
  return result as { x: number; y: number };
}
