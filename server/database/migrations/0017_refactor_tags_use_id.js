export default function migrate(db) {
  // Check if migration already applied
  // by testing if tags table has an 'id' column
  let hasIdColumn = false;
  try {
    const tableInfo = db
      .prepare("PRAGMA table_info(tags)")
      .all();
    hasIdColumn = tableInfo.some((col) => col.name === "id");
  } catch {
    // Table might not exist yet, continue with migration
  }

  if (hasIdColumn) {
    // Migration already applied, skip
    return;
  }

  // Old schema detected, perform migration
  const prevForeignKeys = db.prepare("PRAGMA foreign_keys").get().foreign_keys;
  db.exec("PRAGMA foreign_keys=OFF");

  try {
    // Create new tags table with id
    db.exec(`
      CREATE TABLE tags_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT NOT NULL UNIQUE,
        label TEXT,
        description TEXT,
        icon TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Copy data from old tags table to new table
    db.exec(`
      INSERT INTO tags_new (tag, label, description, icon, created_at)
      SELECT tag, label, description, icon, created_at FROM tags
      ORDER BY rowid
    `);

    // Drop old tags table
    db.exec("DROP TABLE tags");

    // Rename new table
    db.exec("ALTER TABLE tags_new RENAME TO tags");

    // Recreate issue_tags with tag_id instead of tag
    db.exec(`
      CREATE TABLE issue_tags_new (
        issue_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (issue_id, tag_id),
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Migrate data: map old tag slugs to new tag ids
    db.exec(`
      INSERT INTO issue_tags_new (issue_id, tag_id, created_at)
      SELECT it.issue_id, t.id, it.created_at
      FROM issue_tags it
      JOIN tags t ON it.tag = t.tag
    `);

    // Drop old issue_tags table
    db.exec("DROP TABLE issue_tags");

    // Rename new table
    db.exec("ALTER TABLE issue_tags_new RENAME TO issue_tags");

    // Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_issue_tags_tag_id ON issue_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_issue_tags_issue_id ON issue_tags(issue_id);
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag)
    `);
  } finally {
    if (prevForeignKeys) {
      db.exec("PRAGMA foreign_keys=ON");
    }
  }
}
