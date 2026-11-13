import type { Page } from "@playwright/test";

export class PasswordResetPage {
  constructor(readonly page: Page) {}
  async goto(token?: string) {
    await this.page.goto(
      `/reset-password${token === undefined ? "" : `/${token}`}`,
    );
  }
  get notice() {
    return this.page.getByText(/Als dit e-mailadres bij ons bekend is/);
  }
  get error() {
    return this.page.getByText(
      "De link is ongeldig of verlopen. Vraag een nieuwe wachtwoord reset aan.",
      { exact: true },
    );
  }
  async requestReset(email: string) {
    await this.page.getByLabel("E-mailadres", { exact: true }).fill(email);
    await this.page
      .getByRole("button", { name: "Wachtwoord herstellen", exact: true })
      .click();
  }
  async changePassword(secret: string) {
    await this.page
      .getByLabel("Nieuw wachtwoord", { exact: true })
      .fill(secret);
    await this.page
      .getByLabel("Bevestig wachtwoord", { exact: true })
      .fill(secret);
    await this.page
      .getByRole("button", { name: "Wachtwoord wijzigen", exact: true })
      .click();
  }
}
