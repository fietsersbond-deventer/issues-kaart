import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ensureTagMetadata, getTagMetadata, getTagsForIssueId, getTagsForIssueIds, normalizeTags, replaceTagsForIssue, setTagDescription } from "../server/utils/issueTags";
import { migratedDatabase, seed } from "./helpers/server";
let db: DatabaseSync;
beforeEach(async () => { db = await migratedDatabase(); seed(db); db.exec("INSERT INTO issues (id, title, description, geometry, legend_id) VALUES (1, 'x', 'x', '{}', 1)"); });
afterEach(() => db.close());
it("normalizes, limits and deduplicates tags; ignores non-array input", () => {
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(["Café", " cafe ", null, "!!!", "Bike"])).toEqual(["cafe", "bike"]);
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `tag-${i}`))).toHaveLength(10);
});
it("ensures metadata without overwriting labels and supplies fallback metadata for unknown tags", () => {
    expect(ensureTagMetadata(db, [])).toEqual([]);
    ensureTagMetadata(db, ["bike"]);
    db.exec("UPDATE tags SET label = 'Bicycles' WHERE tag = 'bike'");
    ensureTagMetadata(db, ["bike"]);
    expect([...getTagMetadata(db, ["bike", "new"]).values()]).toEqual([{ tag: "bike", label: "Bicycles", description: null, icon: null }, { tag: "new", label: "new", description: null, icon: null }]);
    expect(getTagMetadata(db, []).size).toBe(0);
});
it("changes descriptions preserving existing label/icon, creates missing metadata and rejects empty tags", () => {
    ensureTagMetadata(db, ["bike"]);
    db.exec("UPDATE tags SET label = NULL, icon = 'mdi-bike' WHERE tag = 'bike'");
    expect(setTagDescription(db, "bike", " Description ")).toBe("bike");
    expect(getTagMetadata(db, ["bike"]).get("bike")).toEqual({ tag: "bike", label: "bike", icon: "mdi-bike", description: "Description" });
    expect(setTagDescription(db, "new", null)).toBe("new");
    expect(setTagDescription(db, "!!!", null)).toBeNull();
});
it("replaces links and returns sorted tags, including empty and invalid ID selections", () => {
    expect(replaceTagsForIssue(db, "1", ["Zebra", "Bike"])).toEqual(["zebra", "bike"]);
    expect(getTagsForIssueId(db, 1)).toEqual(["bike", "zebra"]);
    expect([...getTagsForIssueIds(db, [1, "2", "invalid"]).entries()]).toEqual([[1, ["bike", "zebra"]], [2, []]]);
    expect(getTagsForIssueIds(db, []).size).toBe(0);
    replaceTagsForIssue(db, 1, []);
    expect(getTagsForIssueId(db, 1)).toEqual([]);
});

it("loads tags beyond SQLite's parameter limit, retaining empty and sorted results", () => {
    replaceTagsForIssue(db, 1, ["Zebra", "Bike"]);
    const ids = Array.from({ length: 50000 }, (_, i) => i + 1);
    const result = getTagsForIssueIds(db, ids);
    expect(result.size).toBe(50000);
    expect(result.get(1)).toEqual(["bike", "zebra"]);
    expect(result.get(50000)).toEqual([]);
});
