import type { BrowserContext, Page, WebSocketRoute } from "@playwright/test";
import { test, expect, login, secondUser, editIssue, selectCategory, saveIssue, selectTag, draw } from "./fixtures.js";

async function socketConnections(context: BrowserContext | Page) {
  const blocked = new Set<string>();
  const connections: { client: WebSocketRoute; server: WebSocketRoute }[] = [];
  await context.routeWebSocket("**/ts/**", async (client) => {
    if (blocked.has(new URL(client.url()).pathname)) {
      await client.close({ code: 1012 });
      return;
    }
    connections.push({ client, server: client.connectToServer() });
  });
  return { connections, blocked };
}

async function interrupt(sockets: Awaited<ReturnType<typeof socketConnections>>, path: string, whileDisconnected?: () => Promise<void>) {
  const { connections, blocked } = sockets;
  const matching = () => connections.filter(({ client }) => new URL(client.url()).pathname === path);
  await expect.poll(() => matching().length).toBeGreaterThan(0);
  const before = matching().length;
  const connection = matching().at(-1)!;
  blocked.add(path);
  await connection.server.close({ code: 1012, reason: "E2E transport interruption" });
  await connection.client.close({ code: 1012, reason: "E2E transport interruption" });
  if (whileDisconnected) await whileDisconnected();
  blocked.delete(path);
  await expect.poll(() => matching().length).toBeGreaterThan(before);
}

test("6 — lock ownership, competing editor, cancel, reconnect and disconnect release", async ({ page, context, browser }) => {
  const sockets = await socketConnections(page);
  await login(page);
  const other = await secondUser(browser);
  try {
    await other.page.goto("/kaart/101");
    await expect(other.page.getByRole("button", { name: "Bewerken", exact: true })).toBeEnabled();
    await editIssue(page);
    await expect(other.page.getByRole("button", { name: "Bewerkt door E2E User", exact: true })).toBeVisible();
    await expect(other.page.getByRole("button", { name: "Bewerken", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Annuleren", exact: true }).first().click();
    await expect(other.page.getByRole("button", { name: "Bewerken", exact: true })).toBeEnabled();

    await page.getByRole("button", { name: "Bewerken", exact: true }).click();
    await expect(other.page.getByRole("button", { name: "Bewerkt door E2E User", exact: true })).toBeVisible();
    await interrupt(sockets, "/ts/auth");
    await expect(other.page.getByRole("button", { name: "Bewerkt door E2E User", exact: true })).toBeVisible();
    await expect(page.getByLabel("Titel", { exact: true })).toHaveValue("E2E Point");
    await context.close();
    await expect(other.page.getByRole("button", { name: "Bewerken", exact: true })).toBeEnabled();
    await other.page.getByRole("button", { name: "Bewerken", exact: true }).click();
    await expect(other.page.getByLabel("Titel", { exact: true })).toHaveValue("E2E Point");
  } finally {
    await other.context.close();
  }
});

test("7 — another browser receives real create, update, delete and reconnect recovery", async ({ page, browser, context }) => {
  const sockets = await socketConnections(page);
  await login(page);
  await page.goto("/kaart?tag=e2e-route");
  await expect(page.getByRole("button", { name: /1 plek op de kaart/ })).toBeVisible();
  const list = await context.newPage();
  await list.goto("/lijst");
  await expect(list.getByRole("cell", { name: "E2E Polygon", exact: true })).toBeVisible();
  const other = await secondUser(browser);
  try {
    // Create through the editor in the other browser, not through a fabricated WS message.
    await other.page.getByRole("link", { name: "Nieuw onderwerp toevoegen", exact: true }).click();
    await other.page.getByLabel("Titel", { exact: true }).fill("Realtime onderwerp");
    await other.page.locator(".edit-form .ql-editor").fill("Nieuwe inhoud");
    await selectCategory(other.page, "E2E Verkeer");
    await selectTag(other.page, "Route");
    await draw(other.page, "Point");
    const created = await saveIssue(other.page, "POST");
    await expect(page.getByRole("button", { name: /2 plekken op de kaart/ })).toBeVisible();
    await expect(list.getByRole("cell", { name: "Realtime onderwerp", exact: true })).toBeVisible();
    await page.goto(`/kaart/${created.id}?tag=e2e-route`);
    await expect(page.getByRole("heading", { name: "Realtime onderwerp", exact: true })).toBeVisible();
    await editIssue(other.page, created.id);
    await other.page.getByLabel("Titel", { exact: true }).fill("Realtime bijgewerkt");
    await saveIssue(other.page, "PATCH");
    await expect(page.getByRole("heading", { name: "Realtime bijgewerkt", exact: true })).toBeVisible();
    await expect(list.getByRole("cell", { name: "Realtime bijgewerkt", exact: true })).toBeVisible();
    await interrupt(sockets, "/ts/notify", async () => {
      await editIssue(other.page, created.id);
      await other.page.getByLabel("Titel", { exact: true }).fill("Na herstel bijgewerkt");
      await saveIssue(other.page, "PATCH");
    });
    await expect(page.getByRole("heading", { name: "Na herstel bijgewerkt", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /2 plekken op de kaart/ })).toBeVisible();
    await editIssue(other.page, created.id);
    other.page.once("dialog", (dialog) => dialog.accept());
    await other.page.getByRole("button", { name: "Verwijderen", exact: true }).first().click();
    await expect(page).toHaveURL(/\/kaart\?tag=e2e-route$/);
    await expect(page.getByRole("button", { name: /1 plek op de kaart/ })).toBeVisible();
    await expect(list.getByRole("cell", { name: "E2E Polygon", exact: true })).toBeVisible();
    await expect(list.getByRole("cell", { name: /Realtime|Na herstel/ })).toHaveCount(0);
  } finally {
    await other.context.close();
  }
});
