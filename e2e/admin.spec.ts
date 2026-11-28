import { apiHeaders } from "./support/api.js";
import { test, expect } from "./fixtures.js";

test("9 — admin manages users, categories, tags and texts; validation and role restrictions", async ({
  app,
  page,
  request,
}) => {
  await app.loginPage.login("admin@example.test");
  await app.users.goto();
  await app.users.editButton("user@example.test").click();
  await app.users.selectRole("Administrator");
  await app.users.save();
  await expect(app.users.roleCell("user@example.test", "admin")).toBeVisible();
  await page.reload();
  await expect(app.users.roleCell("user@example.test", "admin")).toBeVisible();

  await app.categories.goto();
  await app.categories.create();
  const invalid = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/legends") &&
      response.request().method() === "POST",
  );
  await app.categories.submit();
  expect((await invalid).status()).toBe(400);
  await expect(app.categories.dialog).toBeVisible();
  await app.categories.name.fill("E2E Nieuwe categorie");
  await app.categories.submit();
  await expect(app.categories.cell("E2E Nieuwe categorie")).toBeVisible();
  await page.reload();
  await expect(app.categories.cell("E2E Nieuwe categorie")).toBeVisible();
  const headers = await apiHeaders(request, "admin@example.test");
  const inUse = await request.delete("/api/legends/101", { headers });
  expect(inUse.status()).toBe(400);
  expect((await inUse.json()).message).toContain("in gebruik");

  await app.tags.goto();
  await app.tags.create();
  await app.tags.label.fill("E2E Nieuw label");
  await app.tags.description.fill("Voor browsercontrole");
  await app.tags.submit();
  await expect(app.tags.cell("E2E Nieuw label")).toBeVisible();
  await page.reload();
  await expect(app.tags.cell("E2E Nieuw label")).toBeVisible();

  await app.texts.goto();
  await app.texts.edit("navbar.header");
  await app.texts.text.fill("E2E Aangepaste kop");
  await app.texts.submit();
  await expect(app.texts.dialog).toHaveCount(0);
  await page.reload();
  await expect(app.header.heading).toHaveText("E2E Aangepaste kop");

  // Restore the ordinary account's role, then verify the actual forbidden boundary.
  expect(
    (
      await request.patch("/api/admin/users/102", {
        headers,
        data: { username: "user@example.test", name: "E2E User", role: "user" },
      })
    ).ok(),
  ).toBeTruthy();
  await app.header.logout();
  await app.loginPage.login();
  await app.users.goto();
  await expect(page).toHaveURL(/\/admin\/legends$/);
  await expect(app.users.createButton).toHaveCount(0);
  await app.tags.goto();
  await expect(page).toHaveURL(/\/admin\/tags$/);
  const ordinaryHeaders = await apiHeaders(request);
  expect(
    (
      await request.get("/api/admin/users", { headers: ordinaryHeaders })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/tags", {
        headers: ordinaryHeaders,
        data: { tag: "allowed" },
      })
    ).ok(),
  ).toBeTruthy();
  // Tags/categories/texts APIs are intentionally available to authenticated ordinary users; only user management is admin-only.
});

test("admin imports a Google My Maps KMZ with folders as new and existing categories", async ({
  app,
  page,
  request,
}) => {
  const { zipSync, strToU8 } = await import("fflate");
  const placemark = (name: string, coordinates: string, description = "") =>
    `<Placemark><name>${name}</name><description><![CDATA[${description}]]></description>` +
    `<ExtendedData><Data name="Urgentie"><value>Hoog</value></Data></ExtendedData>` +
    `<Point><coordinates>${coordinates},0</coordinates></Point></Placemark>`;
  const kml =
    `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>` +
    `<Folder><name>E2E Knelpunten</name>${placemark("E2E Kruising", "6.15,52.25", '<img src="files/foto.png">')}</Folder>` +
    `<Folder><name>Verkeer</name>${placemark("E2E Rotonde", "6.16,52.26")}</Folder>` +
    `</Document></kml>`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const kmz = zipSync({
    "doc.kml": strToU8(kml),
    "files/foto.png": new Uint8Array(png),
  });

  await app.loginPage.login("admin@example.test");
  await page.goto("/admin/import");
  await page.locator('input[type="file"]').setInputFiles({
    name: "mymaps.kmz",
    mimeType: "application/vnd.google-earth.kmz",
    buffer: Buffer.from(kmz),
  });
  await expect(
    page.getByText("mymaps.kmz: 2 objecten met een geometrie."),
  ).toBeVisible();
  // The stepper keeps visited steps in the DOM; act within the active step.
  const step = page.locator(".v-window-item--active");
  const next = step.getByRole("button", { name: "Volgende", exact: true });
  await next.click();
  await expect(step.getByText("Urgentie — Hoog")).toBeVisible();
  await next.click();

  const importButton = next;
  await expect(importButton).toBeDisabled();
  await step.getByLabel("Categorie voor E2E Knelpunten").press("Enter");
  await page.getByRole("option", { name: "Nieuwe categorie…" }).click();
  await expect(step.getByLabel("Naam nieuwe categorie")).toHaveValue(
    "E2E Knelpunten",
  );
  await expect(page.getByRole("option")).toHaveCount(0);
  await step.getByLabel("Categorie voor Verkeer").press("Enter");
  await page.getByRole("option", { name: "E2E Verkeer" }).click();
  await importButton.click();

  await expect(
    page.getByText(
      "Er worden 2 onderwerpen aangemaakt en 1 nieuwe categorieën.",
    ),
  ).toBeVisible();
  await step.getByRole("button", { name: "Importeren", exact: true }).click();
  await expect(page.getByText("2 onderwerpen geïmporteerd.")).toBeVisible();
  await expect(
    page.getByText("1 onderwerpen met afbeelding, 1 zonder"),
  ).toBeVisible();
  const tag = await page.locator(".v-alert strong").textContent();
  expect(tag).toMatch(/^import-\d{8}-\d{4}/);

  const categories = await (await request.get("/api/legends")).json();
  const created = categories.find(
    (category: { name: string }) => category.name === "E2E Knelpunten",
  );
  const existing = categories.find(
    (category: { name: string }) => category.name === "E2E Verkeer",
  );
  const rows = await (
    await request.get("/api/issues?fields=id,title,legend_id,description")
  ).json();
  const crossing = rows.find(
    (row: { title: string }) => row.title === "E2E Kruising",
  );
  const roundabout = rows.find(
    (row: { title: string }) => row.title === "E2E Rotonde",
  );
  expect(crossing.legend_id).toBe(created.id);
  expect(crossing.description).toContain('src="data:image/jpeg;base64,');
  expect(roundabout.legend_id).toBe(existing.id);
  // Both issues carry the import tag, so the import can be found afterwards.
  const tagged = await (
    await request.get(`/api/issues?fields=id&tag=${tag}`)
  ).json();
  expect(tagged.map((row: { id: number }) => row.id).sort()).toEqual(
    [crossing.id, roundabout.id].sort(),
  );
});
