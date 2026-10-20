import type { Page } from "@playwright/test";

export class TextsPage {
  constructor(readonly page: Page) {}
  async goto() {
    await this.page.goto("/admin/texts");
  }
  get dialog() {
    return this.page.getByRole("dialog");
  }
  get text() {
    return this.page.getByLabel("Tekst", { exact: true });
  }
  async edit(key: string) {
    await this.page
      .getByRole("button", { name: `${key} bewerken`, exact: true })
      .click();
  }
  async submit() {
    await this.dialog
      .getByRole("button", { name: "Opslaan", exact: true })
      .click();
  }
}
