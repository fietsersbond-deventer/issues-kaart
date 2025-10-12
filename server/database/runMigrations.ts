import sqlite3 from "sqlite3";
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
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);

    db.all(
      `SELECT filename FROM ${MIGRATION_TABLE}`,
      (err, rows: { filename: string }[]) => {
        if (err) throw err;
        const applied = new Set(rows.map((row) => row.filename));

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

        let pending = allFiles.length;
        if (pending === 0) db.close();

        for (const file of allFiles) {
          const filename = path.basename(file);
          if (applied.has(filename)) {
            if (--pending === 0) db.close();
            continue;
          }
          const sql = fs.readFileSync(file, "utf8");
          db.exec(sql, (err) => {
            if (err) {
              console.error(`Migration failed: ${filename}`);
              db.close();
              throw err;
            }
            db.run(
              `INSERT INTO ${MIGRATION_TABLE} (filename) VALUES (?)`,
              filename,
              (err) => {
                if (err) {
                  console.error(`Failed to record migration: ${filename}`);
                  db.close();
                  throw err;
                }
                console.log(`Migration applied: ${filename}`);
                if (--pending === 0) db.close();
              }
            );
          });
        }
      }
    );
  });
}
