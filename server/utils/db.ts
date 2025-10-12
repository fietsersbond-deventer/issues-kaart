import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = path.resolve(__dirname, "../database/fietsersbond.db");
    db = new Database(dbPath);
  }
  return db;
}
