import type { Page } from "@playwright/test";

export class UsersPage {
  constructor(readonly page: Page) {}
  async goto() {
    await this.page.goto("/admin/users");
  }
  row(username: string) {
    return this.page.getByRole("row").filter({ hasText: username });
  }
  editButton(username: string) {
    return this.row(username).getByRole("button", {
      name: "Gebruiker bewerken",
      exact: true,
    });
  }
  roleCell(username: string, role: string) {
    return this.row(username).getByRole("cell", { name: role, exact: true });
  }
  get createButton() {
    return this.page.getByRole("button", {
      name: "Nieuwe gebruiker",
      exact: true,
    });
  }
  async selectRole(role: string) {
    await this.page.getByLabel("Rol", { exact: true }).press("Enter");
    await this.page.getByRole("option", { name: role, exact: true }).click();
  }
  async save() {
    await this.page
      .getByRole("dialog")
      .getByRole("button", { name: "Opslaan", exact: true })
      .click();
  }
}
