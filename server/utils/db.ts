import { DatabaseSync } from "node:sqlite";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    const dbPath =
      process.env.NUXT_DB_PATH || "server/database/fietsersbond.db";
    db = new DatabaseSync(dbPath);
  }
  return db;
}
