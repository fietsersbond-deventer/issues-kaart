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
      db.prepare("SELECT label, description, icon FROM tags WHERE tag = ?").get("fiets"),
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
      db.prepare("SELECT label, description, icon FROM tags WHERE tag = ?").get("fiets"),
    ).toEqual({
      label: null,
      description: "Omschrijving",
      icon: null,
    });
  });
});
