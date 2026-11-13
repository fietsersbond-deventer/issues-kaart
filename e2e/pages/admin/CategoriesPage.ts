import type { Page } from "@playwright/test";

export class CategoriesPage {
  constructor(readonly page: Page) {}
  async goto() {
    await this.page.goto("/admin/legends");
  }
  get dialog() {
    return this.page.getByRole("dialog");
  }
  cell(name: string) {
    return this.page.getByRole("cell", { name, exact: true });
  }
  get name() {
    return this.dialog.getByLabel("Naam", { exact: true });
  }
  async create() {
    await this.page
      .getByRole("button", { name: "Voeg Categorie toe", exact: true })
      .click();
  }
  async submit() {
    await this.dialog
      .getByRole("button", { name: "Opslaan", exact: true })
      .first()
      .click();
  }
}
