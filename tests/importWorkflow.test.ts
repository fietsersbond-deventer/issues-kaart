import type { DatabaseSync } from "node:sqlite";
import type { FeatureCollection } from "geojson";
import { JSDOM } from "jsdom";
import { zipSync, strToU8 } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { member, migratedDatabase, routeHarness, seed } from "./helpers/server";
import { getEmitter } from "../server/utils/getEmitter";
import {
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { downloadImage, MAX_IMAGE_BYTES } from "../server/utils/downloadImage";
import {
  findImportImageIds,
  importImageExists,
  removeImportImages,
  setImportImageDirectory,
  storeImportImage,
} from "../server/utils/importImages";
import {
  buildImportDescription,
  buildImportIssues,
  findRemoteImageUrls,
  listCategoryValues,
  listImportFields,
  parseFeatureCollection,
  replaceImageSources,
} from "../shared/utils/geojsonImport";
import { readImportFile } from "../app/utils/readImportFile";
import {
  CATEGORY_COLORS,
  defaultCategoryColor,
  toCategoryColor,
} from "../shared/utils/categoryColors";
import type { ImportSettings } from "../shared/types/GeojsonImport";

let db: DatabaseSync;
vi.mock("../server/utils/db", () => ({ getDb: () => db }));

const settings = (overrides: Partial<ImportSettings> = {}): ImportSettings => ({
  title: "Knelpunt",
  description: "Bron: test",
  fields: [],
  ...overrides,
});

const collection = (): FeatureCollection => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { naam: "Brug", soort: "Oversteek", info: "a < b\nregel 2" },
      geometry: { type: "Point", coordinates: [6.1, 52.2, 3] },
    },
    {
      type: "Feature",
      properties: { naam: "", soort: "Route", info: "" },
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [6, 52],
            [6.1, 52.1],
          ],
          [
            [6.2, 52.2],
            [6.3, 52.3],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { soort: "Oversteek" },
      geometry: null as never,
    },
  ],
});

const png = (width = 10, height = 10) =>
  sharp({
    create: { width, height, channels: 4, background: "#ff000080" },
  })
    .png()
    .toBuffer();

function imageResponse(
  type = "image/png",
  bytes: number | Uint8Array = 3,
  status = 200,
) {
  const body = typeof bytes === "number" ? new Uint8Array(bytes) : bytes;
  return new Response(body as BodyInit, {
    status,
    headers: { "content-type": type },
  });
}

describe("shared import functions", () => {
  it("rejects files that are not a FeatureCollection of features", () => {
    expect(() => parseFeatureCollection({ type: "Feature" })).toThrow(
      "geen GeoJSON FeatureCollection",
    );
    expect(() =>
      parseFeatureCollection({ type: "FeatureCollection", features: [{}] }),
    ).toThrow("Object 1 is geen GeoJSON Feature");
    expect(() =>
      parseFeatureCollection({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: [1], geometry: null }],
      }),
    ).toThrow("ongeldige gegevensvelden");
    expect(parseFeatureCollection(collection()).features).toHaveLength(3);
  });

  it("lists fields with a first non-empty sample and category values with counts", () => {
    expect(listImportFields(collection())).toEqual([
      { name: "naam", sample: "Brug" },
      { name: "soort", sample: "Oversteek" },
      { name: "info", sample: "a < b\nregel 2" },
    ]);
    // Features without geometry are not imported and not counted.
    expect(listCategoryValues(collection(), "soort")).toEqual([
      { value: "Oversteek", count: 1 },
      { value: "Route", count: 1 },
    ]);
    expect(listCategoryValues(collection(), undefined)).toEqual([
      { value: "", count: 2 },
    ]);
  });

  it("escapes plain fields, keeps the HTML field and skips empty values", () => {
    const html = buildImportDescription(
      { info: "a < b\nregel 2", leeg: "", html: "<b>vet</b>", n: 3 },
      settings({ htmlField: "html", fields: ["info", "leeg", "n", "html"] }),
    );
    // The default description is not added to a feature's own content.
    expect(html).toBe(
      "<b>vet</b><h3>info</h3><p>a &lt; b<br>regel 2</p><h3>n</h3><p>3</p>",
    );
  });

  it("uses the optional default description only for features without content", () => {
    const empty = { info: "", html: "" };
    expect(
      buildImportDescription(
        empty,
        settings({ description: "a\nb", htmlField: "html", fields: ["info"] }),
      ),
    ).toBe("<p>a<br>b</p>");
    expect(
      buildImportDescription(
        empty,
        settings({ description: " ", fields: ["info"] }),
      ),
    ).toBe("");
    expect(
      buildImportDescription(empty, settings({ description: undefined })),
    ).toBe("");
  });

  it("splits multi-geometries, drops altitude, uses the title fallback and skips unmapped values", () => {
    const issues = buildImportIssues(
      collection(),
      settings({ titleField: "naam", categoryField: "soort" }),
      { Oversteek: { legend_id: 1 }, Route: { legend_id: 2 } },
    );
    expect(
      issues.map(({ title, geometry, categoryValue }) => [
        title,
        geometry.type,
        categoryValue,
      ]),
    ).toEqual([
      ["Brug", "Point", "Oversteek"],
      ["Knelpunt", "LineString", "Route"],
      ["Knelpunt", "LineString", "Route"],
    ]);
    expect(issues[0]!.geometry.coordinates).toEqual([6.1, 52.2]);
    expect(
      buildImportIssues(collection(), settings({ categoryField: "soort" }), {
        Route: { legend_id: 2 },
      }),
    ).toHaveLength(2);
  });

  it("names the object with invalid or non-WGS84 geometry", () => {
    const invalid = collection();
    invalid.features[1]!.geometry = {
      type: "Point",
      coordinates: [155000, 463000],
    };
    expect(() =>
      buildImportIssues(invalid, settings(), { "": { legend_id: 1 } }),
    ).toThrow("Object 2: coördinaten zijn geen WGS84");
    invalid.features[1]!.geometry = {
      type: "Polygon",
      coordinates: [
        [
          [6, 52],
          [6.1, 52],
          [6, 52],
        ],
      ],
    };
    expect(() =>
      buildImportIssues(invalid, settings(), { "": { legend_id: 1 } }),
    ).toThrow("Object 2: ongeldige geometrie");
  });

  it("accepts only palette colors, normalizing case and an opaque alpha", () => {
    expect(toCategoryColor("#ffd503")).toBe("#FFD503");
    expect(toCategoryColor("#FFD503FF")).toBe("#FFD503");
    expect(toCategoryColor("#FFD50380")).toBeNull();
    expect(toCategoryColor("#123456")).toBeNull();
    expect(toCategoryColor(undefined)).toBeNull();
    // Neighbouring new categories get different palette colors.
    const defaults = [0, 1, 2].map(defaultCategoryColor);
    expect(new Set(defaults).size).toBe(3);
    expect(
      defaults.every((color) => CATEGORY_COLORS.includes(color as never)),
    ).toBe(true);
  });

  it("finds remote images and replaces or removes them", () => {
    const html =
      '<p>x</p><img src="https://a.test/1.png?x=1&amp;y=2"><img src=\'data:image/png;base64,AA\'><img src="https://a.test/2.png">';
    expect(findRemoteImageUrls(html)).toEqual([
      "https://a.test/1.png?x=1&y=2",
      "https://a.test/2.png",
    ]);
    expect(
      replaceImageSources(
        html,
        new Map([
          ["https://a.test/1.png?x=1&y=2", "data:image/png;base64,BB"],
          ["https://a.test/2.png", null],
        ]),
      ),
    ).toBe(
      "<p>x</p><img src=\"data:image/png;base64,BB\"><img src='data:image/png;base64,AA'>",
    );
  });
});

describe("reading import files in the browser", () => {
  beforeEach(() => {
    vi.stubGlobal("DOMParser", new JSDOM().window.DOMParser);
  });
  afterEach(() => vi.unstubAllGlobals());

  const kml = (description = "") => `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
  <Style id="s"><IconStyle><color>ff0000ff</color></IconStyle></Style>
  <Folder><name>Knelpunten</name>
    <Placemark><name>Kruising</name><styleUrl>#s</styleUrl>
      <description><![CDATA[${description}]]></description>
      <ExtendedData>
        <Data name="Urgentie"><value>Hoog</value></Data>
        <Data name="gx_media_links"><value>https://img.test/a.jpg https://img.test/b.jpg</value></Data>
      </ExtendedData>
      <Point><coordinates>6.1,52.2,0</coordinates></Point>
    </Placemark>
    <Placemark><name>Zonder geometrie</name></Placemark>
  </Folder>
</Document></kml>`;

  it("converts KML with folder, HTML description and media links, without style fields", async () => {
    const result = await readImportFile(
      new File([kml('<img src="https://img.test/a.jpg">Tekst')], "kaart.kml"),
    );
    expect(result.images.size).toBe(0);
    expect(result.collection.features).toHaveLength(1);
    expect(result.collection.features[0]!.properties).toEqual({
      name: "Kruising",
      folder: "Knelpunten",
      Urgentie: "Hoog",
      description:
        '<img src="https://img.test/a.jpg">Tekst<img src="https://img.test/b.jpg">',
    });
  });

  it("keeps KMZ images as bytes with a kmz-file reference instead of data URLs", async () => {
    const archive = zipSync({
      "doc.kml": strToU8(
        kml('<img src="files/foto.png"><img src="files/geen.png">'),
      ),
      "files/foto.png": new Uint8Array([1, 2, 3]),
    });
    const result = await readImportFile(new File([archive], "kaart.kmz"));
    expect(result.collection.features[0]!.properties!.description).toContain(
      '<img src="kmz-file:files/foto.png"><img src="files/geen.png">',
    );
    expect(result.images).toEqual(
      new Map([
        [
          "kmz-file:files/foto.png",
          { bytes: new Uint8Array([1, 2, 3]), type: "image/png" },
        ],
      ]),
    );
  });

  it("reads GeoJSON and reports unsupported, invalid and oversized files", async () => {
    const geojson = new File([JSON.stringify(collection())], "data.geojson");
    expect((await readImportFile(geojson)).collection.features).toHaveLength(3);
    await expect(readImportFile(new File(["x"], "data.csv"))).rejects.toThrow(
      "Kies een .geojson-",
    );
    await expect(readImportFile(new File(["{"], "data.json"))).rejects.toThrow(
      "geen geldige JSON",
    );
    await expect(
      readImportFile(new File(["<kml"], "data.kml")),
    ).rejects.toThrow("KML-bestand is ongeldig");
    await expect(
      readImportFile(new File(["no zip"], "data.kmz")),
    ).rejects.toThrow("geen geldig zip-archief");
    await expect(
      readImportFile(
        new File([zipSync({ "a.txt": strToU8("x") })], "data.kmz"),
      ),
    ).rejects.toThrow("bevat geen KML");
    const large = new File(["x"], "data.geojson");
    Object.defineProperty(large, "size", { value: 26 * 1024 * 1024 });
    await expect(readImportFile(large)).rejects.toThrow("groter dan 25 MB");
  });
});

describe("downloading and storing import images", () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "import-images-"));
    setImportImageDirectory(directory);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(directory, { recursive: true, force: true });
  });

  it("returns the bytes of supported images", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("image/png; charset=x")),
    );
    expect(await downloadImage("https://img.test/a.png")).toEqual(
      Buffer.from([0, 0, 0]),
    );
  });

  it("rejects invalid URLs, other protocols, HTTP errors, non-images and large files", async () => {
    await expect(downloadImage("geen url")).rejects.toThrow("Ongeldige URL");
    await expect(downloadImage("file:///etc/passwd")).rejects.toThrow(
      "file: wordt niet ondersteund",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("image/png", 1, 404)),
    );
    await expect(downloadImage("https://img.test/a")).rejects.toThrow(
      "HTTP 404",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("text/html")),
    );
    await expect(downloadImage("https://img.test/a")).rejects.toThrow(
      "Geen ondersteunde afbeelding (text/html)",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("image/png", MAX_IMAGE_BYTES + 1)),
    );
    await expect(downloadImage("https://img.test/a")).rejects.toThrow(
      "groter dan 50 MB",
    );
  });

  it("stores images in one private mkdtemp folder per process", async () => {
    setImportImageDirectory(undefined);
    const missing = "00000000-0000-0000-0000-000000000000";
    // Before the first image there is no folder and nothing exists.
    expect(importImageExists(missing)).toBe(false);
    await removeImportImages([missing]);
    const refs = await Promise.all([
      storeImportImage(await png()),
      storeImportImage(await png()),
    ]);
    const ids = refs.map((ref) => findImportImageIds(ref)[0]!);
    expect(ids.every((id) => importImageExists(id))).toBe(true);
    // Concurrent first uploads share one folder with a unique name.
    const folder = readdirSync(tmpdir())
      .filter((name) => name.startsWith("import-images-"))
      .map((name) => join(tmpdir(), name))
      .find((path) => existsSync(join(path, `${ids[0]}.jpg`)))!;
    expect(readdirSync(folder).sort()).toEqual(
      ids.map((id) => `${id}.jpg`).sort(),
    );
    rmSync(folder, { recursive: true, force: true });
  });

  it("scales images down to at most 1000 px as JPEG and removes expired files", async () => {
    const old = join(directory, "old.jpg");
    writeFileSync(old, "x");
    utimesSync(old, new Date(0), new Date(0));
    const ref = await storeImportImage(await png(2000, 500));
    expect(ref).toMatch(/^import-image:[0-9a-f-]{36}$/);
    expect(existsSync(old)).toBe(false);
    const [file] = readdirSync(directory);
    const metadata = await sharp(
      readFileSync(join(directory, file!)),
    ).metadata();
    expect(metadata).toMatchObject({
      format: "jpeg",
      width: 1000,
      height: 250,
    });
    await expect(
      storeImportImage(Buffer.from("geen afbeelding")),
    ).rejects.toThrow("geen leesbare afbeelding");
  });
});

describe("import routes", () => {
  let h: ReturnType<typeof routeHarness>;
  let importRoute: typeof import("../server/api/admin/import/index.post").default;
  let imageRoute: typeof import("../server/api/admin/import/image.post").default;

  let directory: string;
  let rawBody: Buffer | undefined;

  beforeEach(async () => {
    h = routeHarness();
    db = await migratedDatabase();
    seed(db);
    directory = mkdtempSync(join(tmpdir(), "import-images-"));
    setImportImageDirectory(directory);
    rawBody = undefined;
    vi.stubGlobal("readRawBody", async () => rawBody);
    importRoute = (await import("../server/api/admin/import/index.post"))
      .default;
    imageRoute = (await import("../server/api/admin/import/image.post"))
      .default;
  });
  afterEach(() => {
    db.close();
    vi.unstubAllGlobals();
    rmSync(directory, { recursive: true, force: true });
  });

  const request = (overrides: Record<string, unknown> = {}) => ({
    geojson: collection(),
    settings: settings({
      titleField: "naam",
      categoryField: "soort",
      htmlField: null,
      fields: ["info"],
    }),
    mappings: {
      Oversteek: { legend_id: 2 },
      Route: { name: "Fietsroutes", color: "#0177a9" },
    },
    ...overrides,
  });

  it("is only available to admins", async () => {
    for (const route of [importRoute, imageRoute]) {
      h.event.context.user = null;
      await expect(route(h.event)).rejects.toMatchObject({ statusCode: 401 });
      h.event.context.user = member;
      await expect(route(h.event)).rejects.toMatchObject({ statusCode: 403 });
    }
  });

  it("imports issues with existing and new categories and sends one notification", async () => {
    const emitted = vi.fn();
    getEmitter().on("issues:imported", emitted);
    h.input.body = { ...request(), fileName: "kaart.geojson" };
    const result = await importRoute(h.event);
    expect(result).toEqual({
      issues: 3,
      legends: 1,
      tag: expect.stringMatching(/^import-\d{8}-\d{4}$/),
      issuesWithImage: 0,
      images: 0,
      removedImages: 0,
    });
    getEmitter().off("issues:imported", emitted);

    // All issues of this import share one identifying tag.
    expect(
      db
        .prepare(
          "SELECT it.issue_id, t.label, t.description FROM issue_tags it JOIN tags t ON t.id = it.tag_id WHERE t.tag = ? ORDER BY it.issue_id",
        )
        .all(result.tag),
    ).toEqual(
      [1, 2, 3].map((issue_id) => ({
        issue_id,
        label: expect.stringMatching(/^Import kaart\.geojson \(/),
        description: expect.stringContaining("door Test Admin"),
      })),
    );

    const rows = db
      .prepare(
        "SELECT i.title, i.slug, i.description, i.plain_text, l.name AS legend, i.updated_by_user_id FROM issues i JOIN legend l ON l.id = i.legend_id ORDER BY i.id",
      )
      .all();
    expect(rows.map((row) => [row.title, row.slug, row.legend])).toEqual([
      ["Brug", "brug", "Parking"],
      ["Knelpunt", "knelpunt", "Fietsroutes"],
      ["Knelpunt", "knelpunt-2", "Fietsroutes"],
    ]);
    expect(rows[0]).toMatchObject({
      description: "<h3>info</h3><p>a &lt; b<br />regel 2</p>",
      plain_text: expect.stringContaining("regel 2"),
      updated_by_user_id: 1,
    });
    expect(
      db.prepare("SELECT color FROM legend WHERE name = 'Fietsroutes'").get(),
    ).toEqual({
      color: "#0177A9",
    });
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveBeenCalledWith({
      count: 3,
      createdBy: "Test Admin",
      createdByUserId: 1,
    });
  });

  it("creates a new category once when several values share its name and sanitizes HTML", async () => {
    const geojson = collection();
    geojson.features[0]!.properties!.html =
      '<script>x()</script><img src="data:image/png;base64,AA">';
    h.input.body = request({
      geojson,
      settings: settings({
        categoryField: "soort",
        htmlField: "html",
        fields: [],
      }),
      mappings: {
        Oversteek: { name: "Nieuw", color: "#E31E1EFF" },
        Route: { name: "nieuw ", color: "#FFD503" },
      },
    });
    await expect(importRoute(h.event)).resolves.toMatchObject({
      issues: 3,
      legends: 1,
    });
    expect(
      db.prepare("SELECT label FROM tags WHERE tag LIKE 'import-%'").get(),
    ).toEqual({ label: expect.stringMatching(/^Import bestand \(/) });
    expect(
      db.prepare("SELECT name, color FROM legend WHERE id > 2").all(),
    ).toEqual([{ name: "Nieuw", color: "#E31E1E" }]);
    const { description } = db
      .prepare("SELECT description FROM issues WHERE id = 1")
      .get() as {
      description: string;
    };
    expect(description).not.toContain("script");
    expect(description).toContain('<img src="data:image/png;base64,AA" />');
  });

  it.each([
    [{ geojson: { type: "Feature" } }, "geen GeoJSON FeatureCollection"],
    [{ settings: settings({ title: " " }) }, "Standaardtitel is verplicht"],
    [
      { settings: settings({ description: 3 as never }) },
      "Standaardbeschrijving moet tekst zijn",
    ],
    [
      { settings: settings({ titleField: "onbekend" }) },
      'Gegevensveld "onbekend" bestaat niet',
    ],
    [
      { settings: settings({ fields: ["onbekend"] }) },
      "Kies alleen gegevensvelden",
    ],
    [{ mappings: [] }, "Koppel minstens één waarde"],
    [{ mappings: {} }, "Koppel minstens één waarde"],
    [
      { mappings: { Fiets: { legend_id: 1 } } },
      'Waarde "Fiets" komt niet voor',
    ],
    [
      { mappings: { Route: { legend_id: 99 } } },
      'Categorie voor "Route" bestaat niet',
    ],
    [
      { mappings: { Route: { name: "X", color: "#123456" } } },
      "heeft een naam en een toegestane kleur nodig",
    ],
    [
      { mappings: { Route: { name: "routes", color: "#FFD503" } } },
      'Categorie "routes" bestaat al',
    ],
    [{ mappings: { Route: {} } }, 'Ongeldige categorie voor "Route"'],
  ])(
    "rejects invalid input without writing (%#)",
    async (overrides, message) => {
      h.input.body = request(overrides);
      await expect(importRoute(h.event)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining(message),
      });
      expect(db.prepare("SELECT COUNT(*) AS n FROM issues").get()).toEqual({
        n: 0,
      });
      expect(db.prepare("SELECT COUNT(*) AS n FROM legend").get()).toEqual({
        n: 2,
      });
    },
  );

  it("rejects geometry errors, empty selections and images that were not downloaded", async () => {
    const invalid = collection();
    invalid.features[0]!.geometry = { type: "Point", coordinates: [999, 0] };
    h.input.body = request({ geojson: invalid });
    await expect(importRoute(h.event)).rejects.toMatchObject({
      message: expect.stringContaining("Object 1: coördinaten zijn geen WGS84"),
    });

    const empty = collection();
    empty.features = [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "GeometryCollection", geometries: [] },
      },
    ];
    h.input.body = request({
      geojson: empty,
      settings: settings(),
      mappings: { "": { legend_id: 1 } },
    });
    await expect(importRoute(h.event)).rejects.toMatchObject({
      message: "Er zijn geen objecten om te importeren",
    });

    const remote = collection();
    remote.features[0]!.properties!.html = '<img src="https://img.test/a.png">';
    h.input.body = request({
      geojson: remote,
      settings: settings({
        categoryField: "soort",
        htmlField: "html",
        fields: [],
      }),
    });
    await expect(importRoute(h.event)).rejects.toMatchObject({
      message: expect.stringContaining("afbeeldingen die niet zijn gedownload"),
    });
  });

  it("processes a remote or uploaded image into a reference and reports failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("image/png", await png())),
    );
    h.input.body = { url: " https://img.test/a.png " };
    await expect(imageRoute(h.event)).resolves.toEqual({
      ref: expect.stringMatching(/^import-image:/),
    });
    h.input.body = { url: "ftp://img.test/a.png" };
    await expect(imageRoute(h.event)).rejects.toMatchObject({
      statusCode: 422,
    });
    h.input.body = {};
    await expect(imageRoute(h.event)).rejects.toMatchObject({
      statusCode: 400,
    });

    // Images from a KMZ archive are uploaded as raw bytes.
    h.input.headers["content-type"] = "image/png";
    rawBody = await png();
    await expect(imageRoute(h.event)).resolves.toEqual({
      ref: expect.stringMatching(/^import-image:/),
    });
    for (const [body, message] of [
      [Buffer.from("tekst"), "geen leesbare afbeelding"],
      [Buffer.alloc(0), "Lege afbeelding"],
      [Buffer.alloc(MAX_IMAGE_BYTES + 1), "groter dan 50 MB"],
    ] as const) {
      rawBody = body;
      await expect(imageRoute(h.event)).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining(message),
      });
    }
  });

  it("embeds stored images while saving and removes them afterwards", async () => {
    const ref = await storeImportImage(await png());
    const geojson = collection();
    geojson.features[0]!.properties!.html = `<img src="${ref}">`;
    geojson.features[1]!.properties!.html = `<img src="${ref}">`;
    h.input.body = request({
      geojson,
      settings: settings({
        categoryField: "soort",
        htmlField: "html",
        fields: [],
      }),
    });
    // Feature 2 is a MultiLineString: two issues that share its image.
    await expect(importRoute(h.event)).resolves.toMatchObject({
      issuesWithImage: 3,
      images: 3,
      removedImages: 0,
    });
    const rows = db.prepare("SELECT description FROM issues").all() as {
      description: string;
    }[];
    expect(rows).toHaveLength(3);
    for (const { description } of rows) {
      expect(description).toMatch(
        /^<img src="data:image\/jpeg;base64,[^"]+" \/>$/,
      );
    }
    expect(readdirSync(directory)).toEqual([]);

    // A reference whose file is gone (expired) is rejected before writing.
    geojson.features[0]!.properties!.html =
      '<img src="import-image:00000000-0000-0000-0000-000000000000">';
    h.input.body = request({
      geojson,
      settings: settings({
        categoryField: "soort",
        htmlField: "html",
        fields: [],
      }),
      mappings: { Oversteek: { legend_id: 1 }, Route: { legend_id: 1 } },
    });
    await expect(importRoute(h.event)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("verlopen"),
    });
    expect(db.prepare("SELECT COUNT(*) AS n FROM issues").get()).toEqual({
      n: 3,
    });
  });
});
