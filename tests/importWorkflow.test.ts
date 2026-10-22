import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { main, inlineImageUrls, extractKmlIssues } from "../scripts/import-google-maps-kml";
import { migratedDatabase } from "./helpers/server";
vi.mock("dotenv/config", () => ({}));
let dir: string, path: string, kml: string;
const document = (shape = '<Point><coordinates>6,52,0</coordinates></Point>') => `<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder><name>Routes</name><Placemark><name>Crossing</name><ExtendedData><Data name="Waar"><value>Crossing</value></Data><Data name="Wat"><value>Safe crossing</value></Data></ExtendedData>${shape}</Placemark></Folder></Document></kml>`;
beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "issues-import-"));
    path = join(dir, "test.db");
    kml = join(dir, "test.kml");
    const source = await migratedDatabase();
    const sql = source.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT IN ('issue_bounds_node', 'issue_bounds_parent', 'issue_bounds_rowid') ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END").all();
    const target = new DatabaseSync(path);
    for (const row of sql)
        target.exec(String(row.sql));
    target.close();
    source.close();
    writeFileSync(kml, document());
    vi.stubEnv("NUXT_DB_PATH", path);
    vi.spyOn(console, "log").mockImplementation(() => { });
    vi.spyOn(console, "warn").mockImplementation(() => { });
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("dry-runs without writes, imports once and updates existing issues on repeat", async () => {
    await main([kml, "--dry-run"]);
    const db = new DatabaseSync(path);
    expect(db.prepare("SELECT * FROM issues").all()).toEqual([]);
    await main([kml]);
    expect(db.prepare("SELECT title, plain_text FROM issues").all()).toEqual([{ title: "Crossing", plain_text: "Waar Crossing Wat Safe crossing" }]);
    writeFileSync(kml, document().replace("Safe crossing", "Changed"));
    await main([kml]);
    expect(db.prepare("SELECT title, plain_text FROM issues").all()).toEqual([{ title: "Crossing", plain_text: "Waar Crossing Wat Changed" }]);
    expect(db.prepare("SELECT COUNT(*) AS n FROM legend").get()!.n).toBe(1);
    db.close();
});
it("rolls back newly inserted legends when an issue write fails", async () => {
    const db = new DatabaseSync(path);
    db.exec("CREATE TRIGGER fail_import BEFORE INSERT ON issues BEGIN SELECT RAISE(ABORT, 'import failed'); END");
    await expect(main([kml])).rejects.toThrow("import failed");
    expect(db.prepare("SELECT * FROM legend").all()).toEqual([]);
    db.close();
});
it("rejects bad CLI options and missing input/database before any mutation", async () => {
    await expect(main([kml, "--wrong"])).rejects.toThrow("Unknown");
    await expect(main([join(dir, "absent")])).rejects.toThrow("KML file not found");
    vi.stubEnv("NUXT_DB_PATH", "");
    await expect(main([kml])).rejects.toThrow("NUXT_DB_PATH is not set");
    vi.stubEnv("NUXT_DB_PATH", join(dir, "absent.db"));
    await expect(main([kml])).rejects.toThrow("Database file not found");
    expect(readFileSync(kml, "utf8")).toBe(document());
});
it("parses line and polygon geometries and skips empty or unsupported features", () => {
    expect(extractKmlIssues(document('<LineString><coordinates>6,52 7,53</coordinates></LineString>')).issues[0]!.geometry.type).toBe("LineString");
    expect(extractKmlIssues(document('<Polygon><outerBoundaryIs><LinearRing><coordinates>6,52 7,52 7,53 6,52</coordinates></LinearRing></outerBoundaryIs></Polygon>')).issues[0]!.geometry.type).toBe("Polygon");
    expect(extractKmlIssues(document("")).skipped).toHaveLength(1);
});
it("downloads each distinct remote image once and rejects unsupported or oversized responses", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "content-type": "image/png; charset=binary" }), arrayBuffer: async () => new TextEncoder().encode("abc").buffer });
    vi.stubGlobal("fetch", fetch);
    expect(await inlineImageUrls('<img src="https://example.test/a"><img src="https://example.test/a"><img src="data:image/png;base64,YQ=="><img>')).toContain("data:image/png;base64,YWJj");
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(inlineImageUrls('<img src="file:///tmp/test">')).rejects.toThrow("Unsupported image URL protocol");
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(inlineImageUrls('<img src="https://example.test/a">')).rejects.toThrow("503");
    fetch.mockResolvedValueOnce({ ok: true, headers: new Headers({ "content-type": "text/html" }) });
    await expect(inlineImageUrls('<img src="https://example.test/a">')).rejects.toThrow("Unsupported image type");
    fetch.mockResolvedValueOnce({ ok: true, headers: new Headers({ "content-type": "image/png" }), arrayBuffer: async () => new ArrayBuffer(10 * 1024 * 1024 + 1) });
    await expect(inlineImageUrls('<img src="https://example.test/a">')).rejects.toThrow("10 MB");
});

it("converts municipal GeoJSON geometry types and retains safe attribute text", async () => {
    const { parseGeojsonImport } = await import("../server/utils/geojsonImport");
    const line = [[4, 52], [5, 53]];
    const polygon = [[[4, 52], [5, 52], [5, 53], [4, 52]]];
    const data = (geometry: unknown, properties: unknown = null) => ({ type: "FeatureCollection", features: [{ type: "Feature", geometry, properties }] });
    for (const geometry of [
        { type: "LineString", coordinates: line },
        { type: "Polygon", coordinates: polygon },
        { type: "MultiLineString", coordinates: [line] },
        { type: "MultiPolygon", coordinates: [polygon] },
        { type: "GeometryCollection", geometries: [{ type: "Point", coordinates: [4, 52] }] },
    ]) {
        const issues = parseGeojsonImport(data(geometry, { nested: { key: "value" }, missing: null, number: 42 }), "Fallback", "Description");
        expect(issues).toHaveLength(1);
        expect(issues[0]!.title).toBe("Fallback");
        expect(issues[0]!.description).toContain("nested");
    }
    for (const geometry of [null, { type: "Unknown" }, { type: "Point", coordinates: [] }, { type: "Point", coordinates: [4, NaN] }, { type: "LineString", coordinates: [[4, 52]] }, { type: "GeometryCollection", geometries: [] }]) {
        expect(() => parseGeojsonImport(data(geometry), "Title", "Text")).toThrow();
    }
    expect(parseGeojsonImport(data({ type: "Point", coordinates: [4, 52] }), "Fallback", "Text")[0]!.title).toBe("Fallback");
    expect(() => parseGeojsonImport({ type: "FeatureCollection", features: Array(50001).fill({}) }, "Title", "Text")).toThrow("50000");
});

it("rejects a high-cardinality category attribute before creating an unbounded admin form", async () => {
    const { prepareGeojsonImport } = await import("../server/utils/geojsonImport");
    const features = Array.from({ length: 201 }, (_, index) => ({ type: "Feature", properties: { kind: `Unique ${index}` }, geometry: { type: "Point", coordinates: [4, 52] } }));
    expect(() => prepareGeojsonImport({ geojson: { type: "FeatureCollection", features }, title: "Dataset", description: "Gemeente", categoryProperty: "kind" })).toThrow("200 categoriegroepen");
    expect(prepareGeojsonImport({ geojson: { type: "FeatureCollection", features }, title: "Dataset", description: "Gemeente" }).preview.groups).toHaveLength(1);
});

it("joins unordered reversed road segments and shows the same reduced counts in the preview", async () => {
    const { prepareGeojsonImport } = await import("../server/utils/geojsonImport");
    const line = (coordinates: number[][]) => ({ type: "Feature", properties: { street: "Teststraat", kind: "Hoofdnet" }, geometry: { type: "LineString", coordinates } });
    const geojson = { type: "FeatureCollection", features: [line([[4.1,52],[4.2,52]]), line([[4.3,52],[4.2,52]]), line([[4,52],[4.1,52]])] };
    const original = structuredClone(geojson);
    const body = { geojson, title: "Road", description: "Gemeente", categoryProperty: "kind", mergeLines: true, mergeProperty: "street" };
    const plan = prepareGeojsonImport(body);
    expect(plan.preview).toMatchObject({ sourceFeatures: 3, issues: 1, lineSegments: 3, lines: 1, groups: [{ sourceFeatures: 3, issues: 1 }] });
    const coordinates = plan.issues[0]!.geometry.coordinates;
    expect([coordinates, [...coordinates].reverse()]).toContainEqual([[4,52],[4.1,52],[4.2,52],[4.3,52]]);
    expect(geojson).toEqual(original);
    expect(prepareGeojsonImport({ ...body, mergeLines: false }).issues).toHaveLength(3);
});

it("does not join branches, gaps, different roads, differing attributes, missing road names or duplicate segments", async () => {
    const { prepareGeojsonImport } = await import("../server/utils/geojsonImport");
    const line = (coordinates: number[][], properties: Record<string, unknown> = { street: "Road" }) => ({ type: "Feature", properties, geometry: { type: "LineString", coordinates } });
    for (const features of [
        [line([[4,52],[5,52]]), line([[5,52],[6,52]]), line([[5,52],[5,53]])],
        [line([[4,52],[5,52]]), line([[5.000001,52],[6,52]])],
        [line([[4,52],[5,52]]), line([[5,52],[6,52]], { street: "Other" })],
        [line([[4,52],[5,52]], { street: "Road", kind: "Plus" }), line([[5,52],[6,52]], { street: "Road", kind: "Hoofd" })],
        [line([[4,52],[5,52]], { street: null }), line([[5,52],[6,52]], { street: null })],
        [line([[4,52],[5,52]], { street: "" }), line([[5,52],[6,52]], { street: "" })],
        [line([[4,52],[5,52]]), line([[5,52],[4,52]])],
    ]) {
        expect(prepareGeojsonImport({ geojson: { type: "FeatureCollection", features }, title: "Road", description: "Text", mergeLines: true, mergeProperty: "street" }).issues).toHaveLength(features.length);
    }
});

it("joins rings, keeps points and polygons intact and rejects invalid merge settings", async () => {
    const { prepareGeojsonImport } = await import("../server/utils/geojsonImport");
    const feature = (geometry: unknown) => ({ type: "Feature", properties: { street: "Ring" }, geometry });
    const body = { geojson: { type: "FeatureCollection", features: [feature({ type: "MultiLineString", coordinates: [[[4,52],[5,52]], [[5,53],[5,52]], [[4,52],[5,53]]] }), feature({ type: "Point", coordinates: [4,52] }), feature({ type: "Polygon", coordinates: [[[4,52],[5,52],[5,53],[4,52]]] })] }, title: "Ring", description: "Text", mergeLines: true, mergeProperty: "street" };
    const plan = prepareGeojsonImport(body);
    expect(plan.issues).toHaveLength(3);
    const ring = plan.issues.find(issue => issue.geometry.type === "LineString")!.geometry.coordinates;
    expect(ring[0]).toEqual(ring.at(-1));
    expect(plan.preview).toMatchObject({ lineSegments: 3, lines: 1 });
    for (const invalid of [{ mergeProperty: "" }, { mergeProperty: "absent" }, { mergeLines: "yes" }, { mergeProperty: 42 }]) expect(() => prepareGeojsonImport({ ...body, ...invalid })).toThrow();
});

it("joins a 27000-segment road with indexed endpoints", async () => {
    const { prepareGeojsonImport } = await import("../server/utils/geojsonImport");
    const features = Array.from({ length: 27000 }, (_, index) => ({ type: "Feature", properties: { street: "Long road" }, geometry: { type: "LineString", coordinates: [[4 + index / 1000000,52],[4 + (index + 1) / 1000000,52]] } }));
    const plan = prepareGeojsonImport({ geojson: { type: "FeatureCollection", features }, title: "Road", description: "Text", mergeLines: true, mergeProperty: "street" });
    expect(plan.issues).toHaveLength(1);
    expect(plan.issues[0]!.geometry.coordinates).toHaveLength(27001);
    expect(plan.preview.groups[0]).toMatchObject({ sourceFeatures: 27000, issues: 1 });
}, 15000);
