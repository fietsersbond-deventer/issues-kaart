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
let commentRoutes: {
    create: typeof import("../server/api/issues/[id]/comments/index.post").default;
    list: typeof import("../server/api/issues/[id]/comments/index.get").default;
    get: typeof import("../server/api/comments/[id].get").default;
    update: typeof import("../server/api/comments/[id].patch").default;
    remove: typeof import("../server/api/comments/[id].delete").default;
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
    commentRoutes = {
        create: (await import("../server/api/issues/[id]/comments/index.post")).default,
        list: (await import("../server/api/issues/[id]/comments/index.get")).default,
        get: (await import("../server/api/comments/[id].get")).default,
        update: (await import("../server/api/comments/[id].patch")).default,
        remove: (await import("../server/api/comments/[id].delete")).default,
    };
    getEmitter().on("issue:created", emitted);
    getEmitter().on("issue:modified", emitted);
    getEmitter().on("issue:deleted", emitted);
    getEmitter().on("comment:created", emitted);
    getEmitter().on("comment:modified", emitted);
    getEmitter().on("comment:deleted", emitted);
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

    describe("comment lifecycle, authorization and cascading contracts", () => {
        it("creates sanitized comment and broadcasts comment:created event", async () => {
            const issue = await create();
            emitted.mockClear();
            h.input.params.id = String(issue.id);
            h.input.body = { body: "<p>Important note</p><script>alert(1)</script>" };

            const comment = await commentRoutes.create(h.event);
            expect(comment).toMatchObject({
                issue_id: issue.id,
                author_id: 1,
                author_name: "Test Admin",
                body: "<p>Important note</p>",
                is_deleted: false,
                deleted_at: null,
            });
            expect(comment.body).not.toContain("script");
            expect(emitted).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: comment.id,
                    createdBy: "Test Admin",
                    createdByUserId: 1,
                }),
            );

            // List comments for issue
            const list = await commentRoutes.list(h.event);
            expect(list).toEqual([
                expect.objectContaining({
                    id: comment.id,
                    issue_id: issue.id,
                    author_name: "Test Admin",
                    body: "<p>Important note</p>",
                }),
            ]);
        });

        it("denies unauthenticated comment creation, retrieval, editing and deletion", async () => {
            const issue = await create();
            h.input.params.id = String(issue.id);
            h.input.body = { body: "Valid comment" };
            const comment = await commentRoutes.create(h.event);

            h.event.context.user = null;
            h.input.params.id = String(comment.id);
            h.input.body = { body: "Modified" };

            await expect(commentRoutes.get(h.event)).rejects.toMatchObject({ statusCode: 401 });
            await expect(commentRoutes.update(h.event)).rejects.toMatchObject({ statusCode: 401 });
            await expect(commentRoutes.remove(h.event)).rejects.toMatchObject({ statusCode: 401 });

            h.input.params.id = String(issue.id);
            await expect(commentRoutes.create(h.event)).rejects.toMatchObject({ statusCode: 401 });
            await expect(commentRoutes.list(h.event)).rejects.toMatchObject({ statusCode: 401 });
        });

        it("rejects empty comment creation and editing", async () => {
            const issue = await create();
            h.input.params.id = String(issue.id);

            for (const invalid of [{}, { body: "" }, { body: "   " }, { body: "<script>bad()</script>" }]) {
                h.input.body = invalid;
                await expect(commentRoutes.create(h.event)).rejects.toMatchObject({ statusCode: 400 });
            }
        });

        it("supports soft deletion showing [deleted comment] and forbids editing deleted comments", async () => {
            const issue = await create();
            h.input.params.id = String(issue.id);
            h.input.body = { body: "Original message" };
            const comment = await commentRoutes.create(h.event);

            emitted.mockClear();
            h.input.params.id = String(comment.id);
            const deleteResult = await commentRoutes.remove(h.event);
            expect(deleteResult).toEqual({ id: comment.id, deleted: true, soft: true });
            expect(emitted).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: comment.id,
                    issue_id: issue.id,
                    deletedBy: "Test Admin",
                    deletedByUserId: 1,
                    soft: true,
                }),
            );

            // Get single comment returns [deleted comment]
            const fetched = await commentRoutes.get(h.event);
            expect(fetched.is_deleted).toBe(true);
            expect(fetched.deleted_at).toBeTruthy();
            expect(fetched.body).toBe("[deleted comment]");

            // Listing also returns [deleted comment]
            h.input.params.id = String(issue.id);
            const list = await commentRoutes.list(h.event);
            expect(list[0]).toMatchObject({
                id: comment.id,
                body: "[deleted comment]",
                is_deleted: true,
            });

            // Editing a deleted comment must fail
            h.input.params.id = String(comment.id);
            h.input.body = { body: "Trying to edit deleted comment" };
            await expect(commentRoutes.update(h.event)).rejects.toMatchObject({
                statusCode: 400,
                message: "Cannot edit a deleted comment",
            });
        });

        it("enforces authorization for updating and deleting comments", async () => {
            const issue = await create();
            h.input.params.id = String(issue.id);
            h.input.body = { body: "Author comment" };
            const comment = await commentRoutes.create(h.event);

            // Another regular user cannot edit or delete
            h.event.context.user = { id: 99, username: "other", name: "Other User", role: "contributor" };
            h.input.params.id = String(comment.id);
            h.input.body = { body: "Hacked comment" };

            await expect(commentRoutes.update(h.event)).rejects.toMatchObject({ statusCode: 403 });
            await expect(commentRoutes.remove(h.event)).rejects.toMatchObject({ statusCode: 403 });

            // Admin can edit and delete
            emitted.mockClear();
            h.event.context.user = { id: 2, username: "admin2", name: "Admin Two", role: "admin" };
            const updated = await commentRoutes.update(h.event);
            expect(updated.body).toBe("Hacked comment");
            expect(emitted).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: comment.id,
                    body: "Hacked comment",
                    modifiedBy: "Admin Two",
                    modifiedByUserId: 2,
                }),
            );
        });

        it("retains comment with null author when user is deleted", async () => {
            const issue = await create();
            // Create user 5
            db.prepare("INSERT INTO users (id, username, password_hash, name) VALUES (5, 'tempuser', 'hash', 'Temp User')").run();

            h.event.context.user = { id: 5, username: "tempuser", name: "Temp User", role: "contributor" };
            h.input.params.id = String(issue.id);
            h.input.body = { body: "Comment by temp user" };
            const comment = await commentRoutes.create(h.event);
            expect(comment.author_id).toBe(5);
            expect(comment.author_name).toBe("Temp User");

            // Delete the user from the database
            db.prepare("DELETE FROM users WHERE id = 5").run();

            // Comment should still exist with author_id = null and author_name = null
            h.input.params.id = String(comment.id);
            const fetched = await commentRoutes.get(h.event);
            expect(fetched.id).toBe(comment.id);
            expect(fetched.author_id).toBeNull();
            expect(fetched.author_name).toBeNull();
            expect(fetched.body).toBe("Comment by temp user");
        });

        it("cascades comment deletion when issue is deleted", async () => {
            const issue = await create();
            h.input.params.id = String(issue.id);
            h.input.body = { body: "Comment on issue" };
            const comment = await commentRoutes.create(h.event);

            expect(db.prepare("SELECT COUNT(*) AS count FROM comments WHERE issue_id = ?").get(issue.id)).toEqual({ count: 1 });

            // Delete issue
            h.input.params.id = String(issue.id);
            await routes.remove(h.event);

            // Comments should be automatically deleted by SQLite foreign key ON DELETE CASCADE
            expect(db.prepare("SELECT COUNT(*) AS count FROM comments WHERE issue_id = ?").get(issue.id)).toEqual({ count: 0 });
            h.input.params.id = String(comment.id);
            await expect(commentRoutes.get(h.event)).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
