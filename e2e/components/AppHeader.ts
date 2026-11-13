import type { Page } from "@playwright/test";

export class AppHeader {
  constructor(readonly page: Page) {}
  get logoutButton() {
    return this.page.getByRole("button", { name: "Uitloggen", exact: true });
  }
  get loginLink() {
    return this.page.getByRole("link", {
      name: "Inloggen beheer",
      exact: true,
    });
  }
  get heading() {
    return this.page.locator(".header-link");
  }
  async logout() {
    await this.logoutButton.click();
  }
  async addIssue() {
    await this.page
      .getByRole("link", { name: "Nieuw onderwerp toevoegen", exact: true })
      .click();
  }
  async openList() {
    await this.page
      .getByRole("link", { name: "Ga naar lijst", exact: true })
      .click();
  }
}
