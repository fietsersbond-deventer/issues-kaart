import type { Page } from "@playwright/test";

export class MapFilters {
  constructor(readonly page: Page) {}
  checkbox(name: string | RegExp) {
    return this.page.getByRole("checkbox", { name });
  }
  count(count: number) {
    return this.page.getByRole("button", {
      name: new RegExp(
        `${count} ${count === 1 ? "plek" : "plekken"} op de kaart`,
      ),
    });
  }
  get photoLayer() {
    return this.page.getByRole("button", {
      name: "Kaartlaag Foto",
      exact: true,
    });
  }
  async open() {
    await this.page
      .getByRole("button", {
        name: "Kaartlagen en legenda openen",
        exact: true,
      })
      .click();
  }
  async close() {
    await this.page
      .getByRole("button", {
        name: "Kaartlagen en legenda sluiten",
        exact: true,
      })
      .click();
  }
  async showAll() {
    await this.page
      .getByTitle("Toon alle onderwerpen", { exact: true })
      .click();
  }
}
