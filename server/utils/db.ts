import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = process.env.NUXT_DB_PATH;
    db = new Database(dbPath);
  }
  return db;
}
