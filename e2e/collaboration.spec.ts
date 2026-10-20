import { test, expect } from "./fixtures.js";
import { createPages } from "./pages/index.js";
import { socketConnections, interrupt } from "./support/sockets.js";

test("6 — lock ownership, competing editor, cancel, reconnect and disconnect release", async ({
  app,
  page,
  context,
  secondUser,
}) => {
  const sockets = await socketConnections(page);
  await app.loginPage.login();
  const other = await secondUser();
  await other.issueMap.goto(101);
  await expect(other.issueMap.details.editButton).toBeEnabled();
  await app.issueMap.editIssue();
  await expect(other.issueMap.details.lockedBy("E2E User")).toBeVisible();
  await expect(other.issueMap.details.editButton).toHaveCount(0);
  await app.issueMap.editor.cancel();
  await expect(other.issueMap.details.editButton).toBeEnabled();

  await app.issueMap.details.edit();
  await expect(other.issueMap.details.lockedBy("E2E User")).toBeVisible();
  await interrupt(sockets, "/ts/auth");
  await expect(other.issueMap.details.lockedBy("E2E User")).toBeVisible();
  await expect(app.issueMap.editor.title).toHaveValue("E2E Point");
  await context.close();
  await expect(other.issueMap.details.editButton).toBeEnabled();
  await other.issueMap.details.edit();
  await expect(other.issueMap.editor.title).toHaveValue("E2E Point");
});

test("7 — another browser receives real create, update, delete and reconnect recovery", async ({
  app,
  page,
  secondUser,
  context,
}) => {
  const sockets = await socketConnections(page);
  await app.loginPage.login();
  await app.issueMap.goto(undefined, "?tag=e2e-route");
  await expect(app.issueMap.filters.count(1)).toBeVisible();
  const listPage = await context.newPage();
  const list = createPages(listPage).issueList;
  await list.goto();
  await expect(list.issueCell("E2E Polygon")).toBeVisible();
  const other = await secondUser();
  // Create through the editor in the other browser, not through a fabricated WS message.
  await other.header.addIssue();
  await other.issueMap.editor.title.fill("Realtime onderwerp");
  await other.issueMap.editor.description.fill("Nieuwe inhoud");
  await other.issueMap.editor.selectCategory("E2E Verkeer");
  await other.issueMap.editor.selectTag("Route");
  await other.issueMap.map.draw("Point");
  const created = await other.issueMap.editor.saveSuccessfully("POST");
  await expect(app.issueMap.filters.count(2)).toBeVisible();
  await expect(list.issueCell("Realtime onderwerp")).toBeVisible();
  await app.issueMap.goto(created.id, "?tag=e2e-route");
  await expect(
    app.issueMap.details.heading("Realtime onderwerp"),
  ).toBeVisible();
  await other.issueMap.editIssue(created.id);
  await other.issueMap.editor.title.fill("Realtime bijgewerkt");
  await other.issueMap.editor.saveSuccessfully("PATCH");
  await expect(
    app.issueMap.details.heading("Realtime bijgewerkt"),
  ).toBeVisible();
  await expect(list.issueCell("Realtime bijgewerkt")).toBeVisible();
  await interrupt(sockets, "/ts/notify", async () => {
    await other.issueMap.editIssue(created.id);
    await other.issueMap.editor.title.fill("Na herstel bijgewerkt");
    await other.issueMap.editor.saveSuccessfully("PATCH");
  });
  await expect(
    app.issueMap.details.heading("Na herstel bijgewerkt"),
  ).toBeVisible();
  await expect(app.issueMap.filters.count(2)).toBeVisible();
  await other.issueMap.editIssue(created.id);
  await other.issueMap.editor.delete(true);
  await expect(page).toHaveURL(/\/kaart\?tag=e2e-route$/);
  await expect(app.issueMap.filters.count(1)).toBeVisible();
  await expect(list.issueCell("E2E Polygon")).toBeVisible();
  await expect(list.issueCell(/Realtime|Na herstel/)).toHaveCount(0);
});
