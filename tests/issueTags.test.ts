import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  getTagMetadata,
  normalizeTag,
  normalizeTags,
  setTagDescription,
} from "../server/utils/issueTags";

describe("issue tag normalization", () => {
  it("normalizes tags into url-friendly slugs", () => {
    expect(normalizeTag(" Fiets Parkeren ")).toBe("fiets-parkeren");
    expect(normalizeTag("Éénrichtingsverkeer!")).toBe("eenrichtingsverkeer");
    expect(normalizeTag("veiligheid---school")).toBe("veiligheid-school");
  });

  it("removes empty tags and deduplicates normalized values", () => {
    expect(
      normalizeTags(["", "Fiets Parkeren", "fiets-parkeren", "   "]),
    ).toEqual(["fiets-parkeren"]);
  });

  it("limits tag length and count", () => {
    const tags = Array.from({ length: 12 }, (_, index) => `tag-${index}`);

    expect(
      normalizeTag("een-heel-lange-tagnaam-die-wordt-afgekapt"),
    ).toHaveLength(30);
    expect(normalizeTags(tags)).toHaveLength(10);
  });

  it("stores tag labels, descriptions and icons keyed by the normalized tag", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE tags (
      tag TEXT PRIMARY KEY,
      label TEXT,
      description TEXT,
      icon TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    const tag = "fiets-parkeren";
    const label = "Fiets parkeren";
    const description = "Parkeerfaciliteiten voor fietsen";
    const icon = "mdi-bike";

    db.prepare(
      `INSERT INTO tags (tag, label, description, icon) VALUES (?, ?, ?, ?)
       ON CONFLICT(tag) DO UPDATE SET label = excluded.label, description = excluded.description, icon = excluded.icon`,
    ).run(tag, label, description, icon);

    expect(getTagMetadata(db, [tag])).toEqual(
      new Map([[tag, { tag, label, description, icon }]]),
    );
  });
});
