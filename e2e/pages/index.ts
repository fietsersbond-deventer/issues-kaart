import type { Page } from "@playwright/test";
import { AppHeader } from "../components/AppHeader.js";
import { LoginPage } from "./LoginPage.js";
import { IssueMapPage } from "./IssueMapPage.js";
import { IssueListPage } from "./IssueListPage.js";
import { PasswordResetPage } from "./PasswordResetPage.js";
import { UsersPage } from "./admin/UsersPage.js";
import { CategoriesPage } from "./admin/CategoriesPage.js";
import { TagsPage } from "./admin/TagsPage.js";
import { TextsPage } from "./admin/TextsPage.js";

export function createPages(page: Page) {
  return {
    header: new AppHeader(page),
    loginPage: new LoginPage(page),
    issueMap: new IssueMapPage(page),
    issueList: new IssueListPage(page),
    passwordReset: new PasswordResetPage(page),
    users: new UsersPage(page),
    categories: new CategoriesPage(page),
    tags: new TagsPage(page),
    texts: new TextsPage(page),
  };
}

export type Pages = ReturnType<typeof createPages>;
