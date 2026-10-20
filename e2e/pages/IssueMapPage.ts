import { expect, type Page } from "@playwright/test";
import { IssueDetails } from "../components/IssueDetails.js";
import { IssueEditor } from "../components/IssueEditor.js";
import { IssueMap } from "../components/IssueMap.js";
import { MapFilters } from "../components/MapFilters.js";

export class IssueMapPage {
  readonly details;
  readonly editor;
  readonly map;
  readonly filters;
  constructor(readonly page: Page) {
    this.details = new IssueDetails(page);
    this.editor = new IssueEditor(page);
    this.map = new IssueMap(page);
    this.filters = new MapFilters(page);
  }
  async goto(id?: number, query = "") {
    await this.page.goto(`/kaart${id === undefined ? "" : `/${id}`}${query}`);
  }
  async editIssue(id = 101) {
    await this.goto(id);
    await expect(this.details.editButton).toBeEnabled();
    await this.details.edit();
    await expect(this.editor.title).toBeVisible();
  }
  get expandPanel() {
    return this.page.getByRole("button", {
      name: "Onderpaneel uitklappen",
      exact: true,
    });
  }
  get collapsePanel() {
    return this.page.getByRole("button", {
      name: "Onderpaneel inklappen",
      exact: true,
    });
  }
}
