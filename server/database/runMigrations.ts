import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const MIGRATION_TABLE = "_hub_migrations";
const DB_PATH =
  process.env.NUXT_DB_PATH ||
  path.resolve(process.cwd(), "server/database/fietsersbond.db");
const MIGRATIONS_DIR = path.resolve(
  process.cwd(),
  "server/database/migrations"
);
const QUERIES_DIR = path.resolve(process.cwd(), "server/database/queries");

export function runMigrations() {
  console.log("--- Migration Runner ---");
  console.log(`DB Path: ${DB_PATH}`);
  console.log(`Migrations Dir: ${MIGRATIONS_DIR}`);
  console.log(`Queries Dir: ${QUERIES_DIR}`);

  const db = new Database(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  const appliedRows = db
    .prepare(`SELECT name FROM ${MIGRATION_TABLE}`)
    .all() as Array<{ name: string }>;
  const applied = new Set(appliedRows.map((row) => row.name));

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const queryFiles = fs.existsSync(QUERIES_DIR)
    ? fs
        .readdirSync(QUERIES_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort()
    : [];
  const allFiles = [
    ...migrationFiles.map((f) => path.join(MIGRATIONS_DIR, f)),
    ...queryFiles.map((f) => path.join(QUERIES_DIR, f)),
  ];

  console.log(`Found ${allFiles.length} migration/query files.`);
  if (allFiles.length) {
    allFiles.forEach((file) => {
      console.log(`  - ${file}`);
    });
  }

  let appliedCount = 0;
  let skippedCount = 0;
  for (const file of allFiles) {
    let name = path.basename(file);
    if (name.endsWith('.sql')) {
      name = name.slice(0, -4);
    }
    if (applied.has(name)) {
      console.log(`Skipped (already applied): ${name}`);
      skippedCount++;
      continue;
    }
    const sql = fs.readFileSync(file, "utf8");
    try {
      db.exec(sql);
      db.prepare(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES (?)`).run(
        name
      );
      console.log(`Migration applied: ${name}`);
      appliedCount++;
    } catch (err) {
      console.error(`Migration failed: ${name}`);
      db.close();
      throw err;
    }
  }
  db.close();
  console.log(`--- Migration Summary ---`);
  console.log(`Applied: ${appliedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Total: ${allFiles.length}`);
}

runMigrations();
