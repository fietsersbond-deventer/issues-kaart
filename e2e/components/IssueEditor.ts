import { expect, type Page } from "@playwright/test";

export class IssueEditor {
  constructor(readonly page: Page) {}
  get title() {
    return this.page.getByLabel("Titel", { exact: true });
  }
  get description() {
    return this.page.locator(".edit-form .ql-editor");
  }
  get requiredTitle() {
    return this.page.getByText("Titel is verplicht", { exact: true });
  }
  get saveButton() {
    return this.page
      .getByRole("button", { name: "Opslaan", exact: true })
      .first();
  }
  async submit() {
    await this.saveButton.click();
  }
  async cancel() {
    await this.page
      .getByRole("button", { name: "Annuleren", exact: true })
      .first()
      .click();
  }
  async delete(confirm: boolean) {
    this.page.once("dialog", (dialog) =>
      confirm ? dialog.accept() : dialog.dismiss(),
    );
    await this.page
      .getByRole("button", { name: "Verwijderen", exact: true })
      .first()
      .click();
  }
  async selectCategory(name: string) {
    await this.page.getByLabel("Categorie", { exact: true }).press("Enter");
    await this.page.getByRole("option", { name, exact: true }).click();
  }

  async selectTag(name: string) {
    await this.page.getByLabel("Tags", { exact: true }).fill(name);
    await this.page.getByRole("option").filter({ hasText: name }).click();
    await this.page.keyboard.press("Escape");
    await this.page.getByLabel("Titel", { exact: true }).click();
  }

  async saveSuccessfully(method: "POST" | "PATCH") {
    const response = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/issues") &&
        response.request().method() === method,
    );
    await this.submit();
    const saved = await response;
    expect(saved.ok()).toBeTruthy();
    const issue: {
      id: number;
      title: string;
      geometry: string;
      legend_id: number;
      tags: string[];
    } = await saved.json();
    await expect(
      this.page.getByRole("heading", { name: issue.title, exact: true }),
    ).toBeVisible();
    return issue;
  }
}
