import { DatabaseSync } from "node:sqlite";
import fs, { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("dotenv", () => ({ config: () => ({}) }));
let dir: string, path: string;
const migrationFiles = readdirSync("server/database/migrations").filter((file) => /\.(sql|js)$/.test(file));
let runMigrations: typeof import("../server/database/runMigrations").runMigrations;
beforeEach(async () => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), "issues-migrations-"));
    path = join(dir, "test.sqlite");
    vi.stubEnv("NUXT_DB_PATH", path);
    for (const name of ["NAME", "SHORT_NAME", "WEBSITE", "CONTACT_URL"])
        vi.stubEnv(`NUXT_PUBLIC_ORGANIZATION_${name}`, name === "NAME" ? "Test <Organization>" : "");
    vi.spyOn(console, "log").mockImplementation(() => { });
    runMigrations = (await import("../server/database/runMigrations")).runMigrations;
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("creates the real schema and safely skips every previously applied migration on the next run", async () => {
    await runMigrations();
    const db = new DatabaseSync(path);
    const count = db.prepare("SELECT COUNT(*) AS n FROM _hub_migrations").get()!.n;
    expect(count).toBe(migrationFiles.length);
    expect(db.prepare("SELECT text FROM text WHERE key = 'intro.content'").get()!.text).toContain("Test &lt;Organization&gt;");
    db.exec("INSERT INTO users (username, password_hash) VALUES ('keep@example.test', 'test')");
    await runMigrations();
    expect(db.prepare("SELECT COUNT(*) AS n FROM _hub_migrations").get()!.n).toBe(count);
    expect(db.prepare("SELECT username FROM users").all()).toEqual([{ username: "keep@example.test" }]);
    expect(db.prepare("PRAGMA table_info(issues)").all().map((row) => row.name)).toContain("plain_text");
    db.close();
    vi.stubGlobal("defineNitroPlugin", <T>(plugin: T) => plugin);
    try {
        const plugin = (await import("../server/plugins/run-migrations")).default;
        await plugin({} as never);
    } finally {
        vi.unstubAllGlobals();
    }
});

it("backfills searchable text for existing rich descriptions, including empty content", async () => {
    const db = new DatabaseSync(":memory:");
    try {
        db.exec("CREATE TABLE issues (id INTEGER PRIMARY KEY, description TEXT, plain_text TEXT)");
        db.prepare("INSERT INTO issues (id, description) VALUES (?, ?)").run(1, "<p>First</p><script>unsafe()</script><p>Second</p>");
        db.prepare("INSERT INTO issues (id, description) VALUES (?, ?)").run(2, "");
        db.prepare("INSERT INTO issues (id, description) VALUES (?, ?)").run(3, null);
        const { default: populate } = await import("../server/database/migrations/0014_populate_plain_text.js");
        populate(db);
        expect(db.prepare("SELECT id, plain_text FROM issues ORDER BY id").all()).toEqual([
            { id: 1, plain_text: "First Second" }, { id: 2, plain_text: "" }, { id: 3, plain_text: "" },
        ]);
    } finally { db.close(); }
});


it("does not mark a failed migration as applied and can retry after a read failure", async () => {
    const listing = vi.spyOn(fs, "readdirSync").mockReturnValueOnce(["missing.sql"] as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
        await expect(runMigrations()).rejects.toThrow("ENOENT");
        const failed = new DatabaseSync(path);
        try {
            expect(failed.prepare("SELECT COUNT(*) AS n FROM _hub_migrations").get()!.n).toBe(0);
        } finally { failed.close(); }
    } finally { listing.mockRestore(); error.mockRestore(); }
    await runMigrations();
    const recovered = new DatabaseSync(path);
    try {
        expect(recovered.prepare("SELECT COUNT(*) AS n FROM _hub_migrations").get()!.n).toBe(migrationFiles.length);
    } finally { recovered.close(); }
});

it("backfills spatial bounds for existing point, line and polygon records", () => {
    const db = new DatabaseSync(":memory:");
    try {
        db.exec("CREATE TABLE issues (id INTEGER PRIMARY KEY, geometry TEXT)");
        const insert = db.prepare("INSERT INTO issues VALUES (?, ?)");
        insert.run(1, JSON.stringify({ type: "Point", coordinates: [4, 52] }));
        insert.run(2, JSON.stringify({ type: "LineString", coordinates: [[4, 51], [6, 53]] }));
        insert.run(3, JSON.stringify({ type: "Polygon", coordinates: [[[3, 50], [5, 50], [5, 52], [3, 50]]] }));
        db.exec(fs.readFileSync("server/database/migrations/0016_issue_spatial_index.sql", "utf8"));
        expect(db.prepare("SELECT * FROM issue_bounds ORDER BY id").all()).toEqual([
            { id: 1, min_x: 4, max_x: 4, min_y: 52, max_y: 52 },
            { id: 2, min_x: 4, max_x: 6, min_y: 51, max_y: 53 },
            { id: 3, min_x: 3, max_x: 5, min_y: 50, max_y: 52 },
        ]);
    } finally { db.close(); }
});
