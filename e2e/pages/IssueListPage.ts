import type { Page } from "@playwright/test";

export class IssueListPage {
  constructor(readonly page: Page) {}
  async goto() {
    await this.page.goto("/lijst");
  }
  get search() {
    return this.page.getByLabel("Zoek", { exact: true });
  }
  issueCell(title: string | RegExp) {
    return this.page.getByRole("cell", { name: title, exact: true });
  }
  get empty() {
    return this.page.getByText("Geen gegevens beschikbaar", { exact: true });
  }
}
