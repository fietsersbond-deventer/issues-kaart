import type { Page } from "@playwright/test";

export class TagsPage {
  constructor(readonly page: Page) {}
  async goto() {
    await this.page.goto("/admin/tags");
  }
  get dialog() {
    return this.page.getByRole("dialog");
  }
  cell(name: string) {
    return this.page.getByRole("cell", { name, exact: true });
  }
  get label() {
    return this.dialog.getByLabel("Label", { exact: true });
  }
  get description() {
    return this.dialog.getByLabel("Omschrijving", { exact: true });
  }
  async create() {
    await this.page
      .getByRole("button", { name: "Nieuwe tag", exact: true })
      .click();
  }
  async submit() {
    await this.dialog
      .getByRole("button", { name: "Opslaan", exact: true })
      .click();
  }
}
