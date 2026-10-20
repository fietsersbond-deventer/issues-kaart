import type { Page } from "@playwright/test";

export class IssueDetails {
  constructor(readonly page: Page) {}
  heading(title: string) {
    return this.page.getByRole("heading", { name: title, exact: true });
  }
  get article() {
    return this.page.locator("article");
  }
  get editButton() {
    return this.page.getByRole("button", { name: "Bewerken", exact: true });
  }
  lockedBy(name: string) {
    return this.page.getByRole("button", {
      name: `Bewerkt door ${name}`,
      exact: true,
    });
  }
  get notFound() {
    return this.page.getByText("Onderwerp niet gevonden", { exact: true });
  }
  async edit() {
    await this.editButton.click();
  }
}
