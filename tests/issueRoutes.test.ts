import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { migratedDatabase, routeHarness, seed } from "./helpers/server";
import { getEmitter } from "../server/utils/getEmitter";
let db: DatabaseSync;
vi.mock("../server/utils/db", () => ({ getDb: () => db }));
let h: ReturnType<typeof routeHarness>;
let routes: {
    create: typeof import("../server/api/issues/index.post").default;
    update: typeof import("../server/api/issues/[id].patch").default;
    remove: typeof import("../server/api/issues/[id].delete").default;
    get: typeof import("../server/api/issues/[id].get").default;
    list: typeof import("../server/api/issues/index.get").default;
    search: typeof import("../server/api/issues/search.get").default;
    geojson: typeof import("../server/api/issues/geojson.get").default;
};
const geometry = { type: "Point", coordinates: [6.1, 52.2] };
const emitted = vi.fn();
beforeEach(async () => {
    h = routeHarness();
    db = await migratedDatabase();
    seed(db);
    routes = {
        create: (await import("../server/api/issues/index.post")).default,
        update: (await import("../server/api/issues/[id].patch")).default,
        remove: (await import("../server/api/issues/[id].delete")).default,
        get: (await import("../server/api/issues/[id].get")).default,
        list: (await import("../server/api/issues/index.get")).default,
        search: (await import("../server/api/issues/search.get")).default,
        geojson: (await import("../server/api/issues/geojson.get")).default,
    };
    getEmitter().on("issue:created", emitted);
    getEmitter().on("issue:modified", emitted);
    getEmitter().on("issue:deleted", emitted);
    getEmitter().on("issues:imported", emitted);
    emitted.mockClear();
});
afterEach(() => { getEmitter().removeAllListeners(); db.close(); vi.unstubAllGlobals(); });
async function create(title = "Safe cycle route") {
    h.input.body = { title, description: '<p>Safe crossing</p><img src="data:image/png;base64,aGVsbG8="><script>bad()</script>', legend_id: 1, geometry, tags: [" Café ", "cafe", "Bike"] };
    const result = await routes.create(h.event);
    h.input.params.id = String(result.id);
    return result;
}
describe("issue persistence contracts with the migrated schema", () => {
    it("creates sanitized content, searchable plain text and normalized deduplicated tags", async () => {
        const issue = await create();
        expect(issue.tags).toEqual(["cafe", "bike"]);
        expect(issue.description).not.toContain("script");
        expect(db.prepare("SELECT plain_text FROM issues WHERE id = ?").get(issue.id!)).toEqual({ plain_text: "Safe crossing" });
        expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ id: issue.id, createdBy: "Test Admin", tags: ["cafe", "bike"] }));
        const loaded = await routes.get(h.event);
        expect(loaded).toMatchObject({ geometry, tags: ["bike", "cafe"], imageUrl: `/api/issues/${issue.id}/image` });
    });
    it("updates all persisted fields and plain text, and broadcasts only committed data", async () => {
        await create();
        h.input.body = { title: "Updated", description: "<p>New text</p>", geometry: { type: "LineString", coordinates: [[6, 52], [7, 53]] }, legend_id: 2, tags: ["new"] };
        const updated = await routes.update(h.event);
        expect(updated).toMatchObject({ title: "Updated", legend_id: 2, tags: ["new"] });
        expect((await routes.get(h.event)).imageUrl).toBeNull();
        expect(db.prepare("SELECT plain_text FROM issues").get()).toEqual({ plain_text: "New text" });
        expect(emitted).toHaveBeenLastCalledWith(expect.objectContaining({ modifiedByUserId: 1, title: "Updated" }));
    });
    it("supports tags-only updates and preserves tags when changing only title", async () => {
        await create();
        h.input.body = { tags: ["only"] };
        expect((await routes.update(h.event)).tags).toEqual(["only"]);
        h.input.body = { title: "Rename" };
        expect((await routes.update(h.event)).tags).toEqual(["only"]);
    });
    it.each(["create", "update", "remove"] as const)("denies unauthenticated %s before writing", async (action) => {
        await create();
        h.event.context.user = null;
        emitted.mockClear();
        await expect(routes[action](h.event)).rejects.toMatchObject({ statusCode: 401 });
        expect(db.prepare("SELECT COUNT(*) AS count FROM issues").get()).toEqual({ count: 1 });
        expect(emitted).not.toHaveBeenCalled();
    });
    it.each([{}, { title: "x", description: "x" }, { title: "x", geometry }, { description: "x", geometry }])("rejects incomplete creates: %j", async (body) => {
        h.input.body = body;
        await expect(routes.create(h.event)).rejects.toMatchObject({ statusCode: 400 });
        expect(emitted).not.toHaveBeenCalled();
    });
    it.each(["create", "update"] as const)("rejects malformed tags/geometry in %s", async (action) => {
        await create();
        for (const invalid of [{ tags: "wrong" }, { geometry: { type: "NotGeometry" } }]) {
            h.input.body = { title: "x", description: "x", geometry, legend_id: 1, ...invalid };
            await expect(routes[action](h.event)).rejects.toMatchObject({ statusCode: 400 });
        }
    });
    it.each(["create", "update"] as const)("rolls back %s when inserting tags fails, without broadcasting", async (action) => {
        await create();
        db.exec("CREATE TRIGGER fail_tag BEFORE INSERT ON issue_tags BEGIN SELECT RAISE(ABORT, 'tag failure'); END");
        emitted.mockClear();
        h.input.body = { title: "Must roll back", description: "description", geometry, legend_id: 1, tags: ["new"] };
        await expect(routes[action](h.event)).rejects.toThrow("tag failure");
        expect(db.prepare("SELECT title FROM issues").all()).toEqual([{ title: "Safe cycle route" }]);
        expect((await routes.get(h.event)).tags).toEqual(["bike", "cafe"]);
        expect(emitted).not.toHaveBeenCalled();
    });
    it.each(["get", "update", "remove"] as const)("reports missing and unknown IDs for %s", async (action) => {
        h.input.body = { title: "x" };
        await expect(routes[action](h.event)).rejects.toMatchObject({ statusCode: 400 });
        h.input.params.id = "999";
        await expect(routes[action](h.event)).rejects.toMatchObject({ statusCode: 404 });
    });
    it("rejects an empty update", async () => {
        await create();
        h.input.body = {};
        await expect(routes.update(h.event)).rejects.toMatchObject({ statusCode: 400 });
    });
    it("deletes an issue and its tag links and broadcasts the removed identity", async () => {
        const issue = await create();
        expect(await routes.remove(h.event)).toEqual({ id: String(issue.id) });
        expect(db.prepare("SELECT * FROM issue_tags").all()).toEqual([]);
        expect(emitted).toHaveBeenLastCalledWith(expect.objectContaining({ id: issue.id, deletedBy: "Test Admin" }));
        await expect(routes.get(h.event)).rejects.toMatchObject({ statusCode: 404 });
    });
    it("lists parsed geometry, tags and image references and supports projections/tag filtering", async () => {
        await create();
        expect(await routes.list(h.event)).toEqual([expect.objectContaining({ geometry, tags: ["bike", "cafe"] })]);
        h.input.query = { fields: "id,title" };
        expect(await routes.list(h.event)).toEqual([{ id: 1, title: "Safe cycle route" }]);
        h.input.query = { fields: "imageUrl,tags", tag: "Café" };
        expect(await routes.list(h.event)).toEqual([{ id: 1, imageUrl: "/api/issues/1/image", tags: ["bike", "cafe"] }]);
        h.input.query = { tag: "absent" };
        expect(await routes.list(h.event)).toEqual([]);
        h.input.query = { fields: "password_hash,SQL" };
        await expect(routes.list(h.event)).rejects.toMatchObject({ statusCode: 400 });
    });
    it("exports GeoJSON with issue properties", async () => {
        await create();
        expect(await routes.geojson(h.event)).toMatchObject({ type: "FeatureCollection", features: [{ type: "Feature", geometry, properties: { id: 1, title: "Safe cycle route" } }] });
    });
    it("searches title, plain text, category and tag metadata, with pagination and snippets", async () => {
        await create();
        await create("Parking");
        h.input.query = { search: '"safe crossing"', orderBy: "id", order: "DESC", itemsPerPage: "1", page: "2" };
        const result = await routes.search(h.event);
        expect(result.total).toBe(2);
        expect(result.items).toEqual([expect.objectContaining({ id: 1, tags: ["bike", "cafe"], snippets: expect.any(Array), imageUrl: "/api/issues/1/image" })]);
        for (const term of ["routes", "cafe"]) {
            h.input.query = { search: term };
            expect((await routes.search(h.event)).total).toBe(2);
        }
        h.input.query = { search: "%" };
        expect((await routes.search(h.event)).total).toBe(0);
        h.input.query = {};
        expect((await routes.search(h.event)).total).toBe(2);
    });
    it.each([{ orderBy: "title; DROP TABLE issues" }, { order: "sideways" }, { page: "0" }, { page: "10001" }, { page: "9007199254740993" }, { page: "1.5" }, { itemsPerPage: "101" }, { search: "x".repeat(201) }, { search: ["x"] }])("rejects invalid search options %j", async (query) => {
        h.input.query = query;
        await expect(routes.search(h.event)).rejects.toMatchObject({ statusCode: 400 });
    });
});


describe("GeoJSON admin import", () => {
    async function runImport() {
        return (await import("../server/api/admin/import.post")).default(h.event);
    }
    beforeEach(() => {
        h.input.body = { title: "Gemeente", description: "Dataset", legend_id: 1, titleProperty: "NAAM", geojson: { type: "FeatureCollection", features: [{ type: "Feature", properties: { NAAM: "Brug", info: "<script>unsafe</script>" }, geometry: { type: "MultiPoint", coordinates: [[4.9, 52.3], [4.8, 52.4]] } }] } };
    });
    it("imports editable parts with attributes, then supports normal editing", async () => {
        expect(await runImport()).toEqual({ imported: 2 });
        expect(db.prepare("SELECT title, legend_id FROM issues").all()).toEqual([{ title: "Brug", legend_id: 1 }, { title: "Brug", legend_id: 1 }]);
        h.input.params.id = "1";
        const issue = await routes.get(h.event);
        expect(issue.geometry).toEqual({ type: "Point", coordinates: [4.9, 52.3] });
        expect(issue.description).toContain("&lt;script&gt;");
        expect(emitted).toHaveBeenCalledTimes(1);
        expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
        h.input.body = { title: "Aangepast" };
        expect(await routes.update(h.event)).toMatchObject({ title: "Aangepast" });
    });
    it("requires admin and valid metadata", async () => {
        h.event.context.user = null;
        await expect(runImport()).rejects.toMatchObject({ statusCode: 401 });
        h.event.context.user = { id: 2, role: "user" };
        await expect(runImport()).rejects.toMatchObject({ statusCode: 403 });
        h.event.context.user = { id: 1, role: "admin" };
        h.input.body.legend_id = 999;
        await expect(runImport()).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = {};
        await expect(runImport()).rejects.toMatchObject({ statusCode: 400 });
    });
    it("rejects invalid features before writing and rolls back database failures", async () => {
        const original = structuredClone(h.input.body);
        h.input.body.geojson = { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [400, 52] } }] };
        await expect(runImport()).rejects.toMatchObject({ statusCode: 400 });
        h.input.body.geojson = {};
        await expect(runImport()).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = original;
        db.exec("CREATE TRIGGER fail_import BEFORE INSERT ON issues WHEN (SELECT COUNT(*) FROM issues) > 0 BEGIN SELECT RAISE(ABORT, 'failed'); END");
        await expect(runImport()).rejects.toThrow("failed");
        expect(db.prepare("SELECT * FROM issues").all()).toEqual([]);
        expect(emitted).not.toHaveBeenCalled();
    });
});

describe("GeoJSON category planning", () => {
    const geojson = { type: "FeatureCollection", features: [
        { type: "Feature", properties: { kind: "Park" }, geometry: { type: "MultiPoint", coordinates: [[4, 52], [5, 52]] } },
        { type: "Feature", properties: { kind: "Plein" }, geometry },
        { type: "Feature", properties: {}, geometry },
    ] };
    const body = () => ({ geojson, title: "Gemeente", description: "Dataset", categoryProperty: "kind" });
    async function preview() { return (await import("../server/api/admin/import/preview.post")).default(h.event); }
    async function save() { return (await import("../server/api/admin/import.post")).default(h.event); }
    it("previews source and split counts without writing, including missing values", async () => {
        h.input.body = body();
        const plan = await preview();
        expect(plan).toMatchObject({ sourceFeatures: 3, issues: 4, attributes: ["kind"], geometries: { MultiPoint: 1, Point: 2 }, groups: [
            { key: '"Park"', label: "Park", sourceFeatures: 1, issues: 2 },
            { key: '"Plein"', label: "Plein", sourceFeatures: 1, issues: 1 },
            { key: "null", label: "(ontbreekt)", sourceFeatures: 1, issues: 1 },
        ] });
        expect(db.prepare("SELECT * FROM issues").all()).toEqual([]);
        expect(emitted).not.toHaveBeenCalled();
    });
    it("maps every group to an existing or newly created category in one transaction", async () => {
        h.input.body = { ...body(), mappings: [
            { key: '"Park"', name: "Parken", color: "#009E3D" },
            { key: '"Plein"', legend_id: 2 },
            { key: "null", legend_id: 1 },
        ] };
        expect(await save()).toEqual({ imported: 4 });
        expect(db.prepare("SELECT name, color FROM legend WHERE name = 'Parken'").get()).toEqual({ name: "Parken", color: "#009E3D" });
        expect(db.prepare("SELECT l.name, COUNT(*) AS count FROM issues i JOIN legend l ON l.id = i.legend_id GROUP BY l.name ORDER BY l.name").all()).toEqual([{ name: "Parken", count: 2 }, { name: "Parking", count: 1 }, { name: "Routes", count: 1 }]);
    });
    it.each([
        [],
        [{ key: '"Park"', legend_id: 1 }],
        [{ key: '"Park"', legend_id: 999 }, { key: '"Plein"', legend_id: 1 }, { key: "null", legend_id: 1 }],
        [{ key: '"Park"', name: "Parken", color: "invalid" }, { key: '"Plein"', legend_id: 1 }, { key: "null", legend_id: 1 }],
    ])("rejects incomplete or invalid mappings without writes: %j", async (...mappings) => {
        h.input.body = { ...body(), mappings };
        await expect(save()).rejects.toMatchObject({ statusCode: 400 });
        expect(db.prepare("SELECT COUNT(*) AS n FROM issues").get()!.n).toBe(0);
        expect(db.prepare("SELECT COUNT(*) AS n FROM legend").get()!.n).toBe(2);
    });
    it("rolls back new categories and all issues when any issue fails", async () => {
        db.exec("CREATE TRIGGER fail_import BEFORE INSERT ON issues WHEN (SELECT COUNT(*) FROM issues) > 0 BEGIN SELECT RAISE(ABORT, 'failed'); END");
        h.input.body = { ...body(), mappings: [{ key: '"Park"', name: "Parken", color: "#009E3D" }, { key: '"Plein"', legend_id: 1 }, { key: "null", legend_id: 1 }] };
        await expect(save()).rejects.toThrow("failed");
        expect(db.prepare("SELECT * FROM issues").all()).toEqual([]);
        expect(db.prepare("SELECT COUNT(*) AS n FROM legend").get()!.n).toBe(2);
        expect(emitted).not.toHaveBeenCalled();
    });
    it("protects preview and Amsterdam loading with admin authorization", async () => {
        h.event.context.user = { id: 2, role: "user" };
        await expect(preview()).rejects.toMatchObject({ statusCode: 403 });
        await expect((await import("../server/api/admin/import/amsterdam.get")).default(h.event)).rejects.toMatchObject({ statusCode: 403 });
    });
});

describe("spatial map queries", () => {
    it("maintains indexed bounds across create, move and delete and intersects crossing lines", async () => {
        await create();
        h.input.body = { title: "Crossing", description: "Line", legend_id: 2, geometry: { type: "LineString", coordinates: [[4, 52], [8, 52]] } };
        const line = await routes.create(h.event);
        h.input.query = { fields: "id,geometry", bbox: "5,51,7,53", cat: "2" };
        expect(await routes.list(h.event)).toEqual([expect.objectContaining({ id: line.id })]);
        h.input.params.id = String(line.id);
        h.input.body = { geometry: { type: "Point", coordinates: [10, 50] } };
        await routes.update(h.event);
        expect(await routes.list(h.event)).toEqual([]);
        expect(db.prepare("SELECT min_x FROM issue_bounds WHERE id = ?").get(line.id!)!.min_x).toBe(10);
        await routes.remove(h.event);
        expect(db.prepare("SELECT * FROM issue_bounds WHERE id = ?").get(line.id!)).toBeUndefined();
        h.input.query = { fields: "id,bbox" };
        expect(await routes.list(h.event)).toEqual([{ id: 1, bbox: expect.arrayContaining([expect.any(Number)]) }]);
    });
    it.each([{ bbox: "4,,5,53" }, { bbox: "x" }, { bbox: "4,52,3,53" }, { bbox: "-181,0,10,50" }, { bbox: ["4,52,5,53"] }, { cat: "1;DROP" }, { cat: "0" }])("rejects invalid spatial filters: %j", async query => {
        h.input.query = query;
        await expect(routes.list(h.event)).rejects.toMatchObject({ statusCode: 400 });
    });
    it("keeps a 27000-row map query bounded to its viewport and omits full geometry from the catalogue", async () => {
        const insert = db.prepare("INSERT INTO issues (title,description,legend_id,geometry) VALUES ('Scale','Scale',1,?)");
        db.exec("BEGIN");
        for (let index = 0; index < 27000; index++) insert.run(JSON.stringify({ type: "Point", coordinates: index < 10 ? [4.9, 52.3] : [6.1, 52.2] }));
        db.exec("COMMIT");
        h.input.query = { fields: "id,geometry", bbox: "4.8,52.2,5,52.4", cat: "1" };
        expect(await routes.list(h.event)).toHaveLength(10);
        h.input.query = { fields: "id,bbox,tags" };
        const catalogue = await routes.list(h.event);
        expect(catalogue).toHaveLength(27000);
        expect(catalogue.every(row => !("geometry" in row) && Array.isArray(row.bbox))).toBe(true);
        expect(db.prepare("EXPLAIN QUERY PLAN SELECT id FROM issue_bounds WHERE min_x <= 5 AND max_x >= 4").all().some(row => String(row.detail).includes("VIRTUAL TABLE INDEX"))).toBe(true);
    });
});

it("commits a 27000-feature import and publishes exactly one summary", async () => {
    h.input.body = { title: "Scale", description: "Scale dataset", legend_id: 1, geojson: { type: "FeatureCollection", features: Array.from({ length: 27000 }, () => ({ type: "Feature", geometry, properties: {} })) } };
    const route = (await import("../server/api/admin/import.post")).default;
    expect(await route(h.event)).toEqual({ imported: 27000 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM issues").get()!.n).toBe(27000);
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveBeenCalledWith({ count: 27000, createdBy: "Test Admin", createdByUserId: 1 });
}, 15000);
