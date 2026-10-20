import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { H3Event } from "h3";
import { createError } from "h3";
import { vi } from "vitest";
import { requireAdminSession, requireUserSession } from "../../server/utils/requireUserSession";
import { getPlainText } from "../../server/utils/getPlainText";
/** A fresh real schema, without contributor data or external services. */
export async function migratedDatabase() {
    const db = new DatabaseSync(":memory:");
    for (const file of readdirSync(resolve("server/database/migrations")).sort()) {
        if (file.endsWith(".sql"))
            db.exec(readFileSync(resolve("server/database/migrations", file), "utf8"));
        if (file.endsWith(".js")) {
            const migration = await import(`../../server/database/migrations/${file.slice(0, -3)}.js`);
            migration.default(db);
        }
    }
    return db;
}
export const admin = { id: 1, username: "admin@example.test", name: "Test Admin", role: "admin" };
export const member = { id: 2, username: "user@example.test", name: "Test User", role: "user" };
/** Route-unit boundary: Nuxt/H3 plumbing is replaced; SQL and domain code are real. */
export function routeHarness() {
    const input = {
        body: {} as Record<string, unknown>,
        params: {} as Record<string, string | undefined>,
        query: {} as Record<string, unknown>,
        headers: {} as Record<string, string>,
    };
    const event = { context: { user: admin as typeof admin | null } } as unknown as H3Event;
    const responseHeaders = new Map<string, string>();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("readBody", async () => input.body);
    vi.stubGlobal("getRouterParam", (_event: H3Event, name: string) => input.params[name]);
    vi.stubGlobal("getQuery", () => input.query);
    vi.stubGlobal("getHeader", (_event: H3Event, name: string) => input.headers[name]);
    vi.stubGlobal("setHeader", (_event: H3Event, name: string, value: string) => responseHeaders.set(name, value));
    vi.stubGlobal("setResponseHeader", (_event: H3Event, name: string, value: string) => responseHeaders.set(name, value));
    vi.stubGlobal("createError", createError);
    vi.stubGlobal("requireUserSession", requireUserSession);
    vi.stubGlobal("requireAdminSession", requireAdminSession);
    vi.stubGlobal("getPlainText", getPlainText);
    return { input, event, responseHeaders };
}
export function seed(db: DatabaseSync) {
    db.prepare("INSERT INTO users (id, username, name, role, password_hash) VALUES (?, ?, ?, ?, 'unused')")
        .run(admin.id, admin.username, admin.name, admin.role);
    db.prepare("INSERT INTO users (id, username, name, role, password_hash) VALUES (?, ?, ?, ?, 'unused')")
        .run(member.id, member.username, member.name, member.role);
    db.exec("INSERT INTO legend (id, name, color) VALUES (1, 'Routes', '#ff0000'), (2, 'Parking', '#00ff00')");
}
