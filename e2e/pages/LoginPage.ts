import { expect, type Page } from "@playwright/test";
import { password } from "../seed.js";
import { AppHeader } from "../components/AppHeader.js";

export class LoginPage {
  constructor(readonly page: Page) {}
  get username() {
    return this.page.getByLabel("E-mailadres of gebruikersnaam");
  }
  get password() {
    return this.page.getByLabel("Wachtwoord", { exact: true });
  }
  get error() {
    return this.page.getByText("Ongeldige gebruikersnaam of wachtwoord.", {
      exact: true,
    });
  }
  async goto() {
    await this.page.goto("/login");
  }
  async submit(username: string, secret: string) {
    await this.username.fill(username);
    await this.password.fill(secret);
    await this.page.getByRole("button", { name: "Login", exact: true }).click();
  }
  async login(username = "user@example.test", secret = password) {
    await this.goto();
    await this.submit(username, secret);
    await expect(new AppHeader(this.page).logoutButton).toBeVisible();
  }
}
