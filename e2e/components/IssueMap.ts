import { expect, type Page } from "@playwright/test";

export class IssueMap {
  constructor(readonly page: Page) {}
  get canvas() {
    return this.page.getByTestId("issue-map").locator("canvas").first();
  }
  async draw(type: "Point" | "LineString" | "Polygon", replace = false) {
    if (replace) this.page.once("dialog", (dialog) => dialog.accept());
    await this.page
      .getByRole("button", {
        name: {
          Point: "Teken punt",
          LineString: "Teken lijn",
          Polygon: "Teken vlak",
        }[type],
        exact: true,
      })
      .click();
    const viewport = this.page
      .getByTestId("issue-map")
      .locator(".ol-viewport")
      .first();
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

  // Locate the rendered red fixture point from canvas pixels, without reading Vue/Pinia state.
  // Tile canvases may be cross-origin; only the readable vector canvas is relevant.
  async renderedPoint() {
    let result: { x: number; y: number } | null = null;
    let previous: { x: number; y: number } | null = null;
    let stable = 0;
    await expect
      .poll(async () => {
        result = await this.page.getByTestId("issue-map").evaluate((root) => {
          for (const canvas of root.querySelectorAll("canvas")) {
            if (canvas.closest(".mini-map")) continue;
            try {
              const context = canvas.getContext("2d");
              if (!context || !canvas.width || !canvas.height) continue;
              const pixels = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              ).data;
              let totalX = 0,
                totalY = 0,
                count = 0;
              for (let i = 0; i < pixels.length; i += 4) {
                if (
                  pixels[i]! > 200 &&
                  pixels[i + 1]! < 40 &&
                  pixels[i + 2]! < 40 &&
                  pixels[i + 3]! > 200
                ) {
                  const pixel = i / 4;
                  totalX += pixel % canvas.width;
                  totalY += Math.floor(pixel / canvas.width);
                  count++;
                }
              }
              if (count > 20) {
                const box = canvas.getBoundingClientRect();
                return {
                  x: box.x + (totalX / count / canvas.width) * box.width,
                  y: box.y + (totalY / count / canvas.height) * box.height,
                };
              }
            } catch {
              /* A remote background canvas cannot be read. */
            }
          }
          return null;
        });
        if (
          result &&
          previous &&
          Math.hypot(result.x - previous.x, result.y - previous.y) < 0.5
        )
          stable++;
        else stable = 0;
        previous = result;
        return stable >= 2;
      })
      .toBe(true);
    if (!result) throw new Error("No rendered point");
    return result as { x: number; y: number };
  }

  async clickRenderedPoint() {
    const pixel = await this.renderedPoint();
    await this.page.mouse.click(pixel.x, pixel.y);
  }
}
