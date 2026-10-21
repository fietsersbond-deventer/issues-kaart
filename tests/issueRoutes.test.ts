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
        expect(emitted).toHaveBeenCalledTimes(2);
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
