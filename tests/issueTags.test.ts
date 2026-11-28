import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setTagMetadata } from "../server/utils/issueTags";

describe("setTagMetadata", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(
      `CREATE TABLE tags (
        tag TEXT PRIMARY KEY,
        label TEXT,
        description TEXT,
        icon TEXT
      )`,
    );
  });

  afterEach(() => {
    db.close();
  });

  it("stores all provided metadata values", () => {
    setTagMetadata(db, "fiets", {
      label: "Fietsen",
      description: "Bestaande omschrijving",
      icon: "mdi-bike",
    });

    expect(
      db
        .prepare("SELECT label, description, icon FROM tags WHERE tag = ?")
        .get("fiets"),
    ).toEqual({
      label: "Fietsen",
      description: "Bestaande omschrijving",
      icon: "mdi-bike",
    });
  });

  it("allows explicit null to clear metadata fields", () => {
    setTagMetadata(db, "fiets", {
      label: "Fietsen",
      description: "Omschrijving",
      icon: "mdi-bike",
    });

    setTagMetadata(db, "fiets", {
      label: null,
      description: "Omschrijving",
      icon: null,
    });

    expect(
      db
        .prepare("SELECT label, description, icon FROM tags WHERE tag = ?")
        .get("fiets"),
    ).toEqual({
      label: null,
      description: "Omschrijving",
      icon: null,
    });
  });
});

describe("createImportTag", () => {
  it("creates a unique Amsterdam-time import tag with label and description", async () => {
    const { migratedDatabase } = await import("./helpers/server");
    const { createImportTag } = await import("../server/utils/issueTags");
    const db = await migratedDatabase();
    const now = new Date("2026-11-28T14:30:00Z");
    const metadata = {
      label: "Import kaart.kmz",
      description: "Uit kaart.kmz",
    };
    const first = createImportTag(db, metadata, now);
    const second = createImportTag(db, metadata, now);
    expect([first.tag, second.tag]).toEqual([
      "import-20261128-1530",
      "import-20261128-1530-2",
    ]);
    expect(
      db
        .prepare("SELECT id, label, description FROM tags WHERE tag = ?")
        .get(first.tag),
    ).toEqual({
      id: first.id,
      label: "Import kaart.kmz",
      description: "Uit kaart.kmz",
    });
    db.close();
  });
});
