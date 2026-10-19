import type { DatabaseSync } from "node:sqlite";
import type { H3Event } from "h3";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { member, migratedDatabase, routeHarness, seed } from "./helpers/server";
let db: DatabaseSync;
vi.mock("../server/utils/db", () => ({ getDb: () => db }));
let h: ReturnType<typeof routeHarness>;
const handlers = import.meta.glob<{
    default: (event: H3Event) => unknown;
}>("../server/api/**/*.ts");
async function call(path: string) {
    return (await handlers[`../server/api/${path}.ts`]!()).default(h.event);
}
beforeEach(async () => { h = routeHarness(); db = await migratedDatabase(); seed(db); });
afterEach(() => { db.close(); vi.unstubAllGlobals(); });
const protectedRoutes = ["admin/users/index.get", "admin/users/index.post", "admin/users/[id].patch", "admin/users/[id].delete", "tags/index.post", "tags/[tag].patch", "tags/[tag].delete"];
describe("admin boundary and metadata persistence", () => {
    it.each(protectedRoutes)("denies anonymous/member access to %s", async (route) => {
        h.event.context.user = null;
        await expect(call(route)).rejects.toMatchObject({ statusCode: 401 });
        h.event.context.user = member;
        await expect(call(route)).rejects.toMatchObject({ statusCode: 403 });
    });
    it("creates, lists, updates and deletes a user without exposing password hashes", async () => {
        h.input.body = { username: "new@example.test", password: "Long!Random!Giraffe!934" };
        const user = await call("admin/users/index.post") as {
            id: number;
        };
        expect(user).toMatchObject({ username: "new@example.test", name: null, role: "user" });
        expect(user).not.toHaveProperty("password_hash");
        expect(bcrypt.compareSync(String(h.input.body.password), String(db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id)!.password_hash))).toBe(true);
        expect(await call("admin/users/index.get")).toHaveLength(3);
        h.event.context.params = { id: String(user.id) };
        h.input.body = { username: "changed@example.test", name: "Updated", role: "admin" };
        expect(await call("admin/users/[id].patch")).toMatchObject({ username: "changed@example.test", name: "Updated", role: "admin" });
        expect(await call("admin/users/[id].delete")).toEqual({ success: true });
        expect(await call("admin/users/index.get")).toHaveLength(2);
    });
    it("rejects missing/weak passwords, missing IDs and missing usernames", async () => {
        await expect(call("admin/users/index.post")).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = { username: "new", password: "123" };
        await expect(call("admin/users/index.post")).rejects.toMatchObject({ statusCode: 400 });
        await expect(call("admin/users/[id].patch")).rejects.toMatchObject({ statusCode: 400 });
        await expect(call("admin/users/[id].delete")).rejects.toMatchObject({ statusCode: 400 });
        h.event.context.params = { id: "99" };
        h.input.body = {};
        await expect(call("admin/users/[id].patch")).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = { username: "unknown", role: "user" };
        await expect(call("admin/users/[id].patch")).rejects.toMatchObject({ statusCode: 404 });
    });
    it("creates and retrieves a category, updates its metadata, and deletes unused categories", async () => {
        h.input.body = { name: "Lighting", description: "Night routes", color: "#123456", icon: "mdi-bike", icon_data_url: "data:image/png;base64,YQ==" };
        const category = await call("legends/index.post") as {
            id: number;
        };
        h.input.params.id = String(category.id);
        expect(await call("legends/[id].get")).toEqual(category);
        h.input.body = { name: "Updated", description: "desc", color: "#ffffff", icon: "mdi-car", icon_data_url: "data:x" };
        expect(await call("legends/[id].patch")).toMatchObject(h.input.body);
        h.input.body = { name: "Minimal" };
        expect(await call("legends/[id].patch")).toMatchObject({ name: "Minimal", icon: null, icon_data_url: null });
        expect(await call("legends/index.get")).toHaveLength(3);
        expect(await call("legends/[id].delete")).toEqual({ success: true });
        await expect(call("legends/[id].get")).rejects.toMatchObject({ statusCode: 404 });
    });
    it("protects categories in use and reports usage identities", async () => {
        db.prepare("INSERT INTO issues (title, description, geometry, legend_id) VALUES ('Linked', 'text', '{}', 1)").run();
        expect(await call("admin/legends/usage.get")).toEqual({ 1: { usage_count: 1, used_by_issues: [{ id: 1, title: "Linked" }] }, 2: { usage_count: 0, used_by_issues: [] } });
        h.input.params.id = "1";
        await expect(call("legends/[id].delete")).rejects.toMatchObject({ statusCode: 400, data: { issues: [{ id: 1, title: "Linked" }] } });
    });
    it("rejects incomplete category writes and missing or unknown IDs", async () => {
        await expect(call("legends/index.post")).rejects.toMatchObject({ statusCode: 400 });
        for (const route of ["legends/[id].get", "legends/[id].patch", "legends/[id].delete"]) {
            await expect(call(route)).rejects.toMatchObject({ statusCode: 400 });
            h.input.params.id = "999";
            h.input.body = { name: "x" };
            await expect(call(route)).rejects.toMatchObject({ statusCode: 404 });
            h.input.params = {};
            h.input.body = {};
        }
        h.input.params.id = "1";
        await expect(call("legends/[id].patch")).rejects.toMatchObject({ statusCode: 400 });
    });
    it("normalizes, lists, searches and updates tag metadata, then removes links on deletion", async () => {
        h.input.body = { tag: " Café ", label: "Coffee", description: "Stop", icon: "mdi-coffee" };
        expect(await call("tags/index.post")).toEqual({ tag: "cafe", label: "Coffee", description: "Stop", icon: "mdi-coffee" });
        h.input.body = { tag: "bike" };
        await call("tags/index.post");
        expect(await call("tags/index.get")).toHaveLength(2);
        h.input.query = { q: "Café" };
        expect(await call("tags/index.get")).toEqual([expect.objectContaining({ tag: "cafe" })]);
        h.input.params.tag = "Café";
        h.input.body = { description: " New " };
        expect(await call("tags/[tag].patch")).toEqual({ tag: "cafe", label: "Coffee", description: "New", icon: "mdi-coffee" });
        h.input.body = { label: null, description: null, icon: null };
        expect(await call("tags/[tag].patch")).toEqual({ tag: "cafe", label: "cafe", description: null, icon: null });
        db.exec("INSERT INTO issues (id, title, description, geometry, legend_id) VALUES (1, 'x', 'x', '{}', 1); INSERT INTO issue_tags (issue_id, tag) VALUES (1, 'cafe')");
        expect(await call("tags/[tag].delete")).toEqual({ success: true });
        expect(db.prepare("SELECT * FROM issue_tags").all()).toEqual([]);
        await expect(call("tags/[tag].delete")).rejects.toMatchObject({ statusCode: 404 });
    });
    it.each(["tags/index.post", "tags/[tag].patch", "tags/[tag].delete"])("rejects missing tag in %s", async (route) => {
        await expect(call(route)).rejects.toMatchObject({ statusCode: 400 });
    });
    it("updates text with type-specific validation and records the editor", async () => {
        expect(await call("texts/index.get")).toHaveLength(4);
        h.input.params.key = "navbar.header";
        h.input.body = { text: "Plain title" };
        expect(await call("texts/[key].patch")).toMatchObject({ key: "navbar.header", text: "Plain title", text_type: "plain" });
        expect(await call("admin/texts/index.get")).toContainEqual(expect.objectContaining({ key: "navbar.header", updated_by_name: "Test Admin" }));
        h.input.params.key = "navbar.websiteUrl";
        h.input.body = { text: "javascript:alert(1)" };
        await expect(call("texts/[key].patch")).rejects.toMatchObject({ statusCode: 400 });
    });
    it("rejects missing text key, invalid body and absent entry", async () => {
        await expect(call("texts/[key].patch")).rejects.toMatchObject({ statusCode: 400 });
        h.input.params.key = "missing";
        await expect(call("texts/[key].patch")).rejects.toMatchObject({ statusCode: 400 });
        h.input.body = { text: "valid" };
        await expect(call("texts/[key].patch")).rejects.toMatchObject({ statusCode: 404 });
    });
});
