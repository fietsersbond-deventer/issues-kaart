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
    const sql = source.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC").all();
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
    expect(() => parseGeojsonImport({ type: "FeatureCollection", features: Array(10001).fill({}) }, "Title", "Text")).toThrow("10000");
});
