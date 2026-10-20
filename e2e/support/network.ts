import type { BrowserContext } from "@playwright/test";

export async function isolateExternalServices(context: BrowserContext) {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === "http://127.0.0.1:3100" ||
      !["http:", "https:"].includes(url.protocol)
    ) {
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
