import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { useRuntimeConfig } from "#imports";
export const scanMigrations = async (migrationDir) => {
  const resolvedDir = resolve(migrationDir);
  try {
    const files = await readdir(resolvedDir);
    const sqlFiles = files.filter((file) => file.endsWith(".sql"));
    const migrations = [];
    for (const file of sqlFiles) {
      const filePath = join(resolvedDir, file);
      const sql = await readFile(filePath, "utf-8");
      const match = file.match(/^(\d{14})_(.+)\.sql$/);
      const timestamp = match ? match[1] : "0";
      const description = match ? match[2] : file;
      migrations.push({
        filename: file,
        timestamp,
        description,
        sql,
        checksum: generateChecksum(sql)
      });
    }
    return migrations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};
export const generateChecksum = (content) => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};
export const ensureMigrationsTable = async (db, tableName) => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      success BOOLEAN NOT NULL DEFAULT TRUE,
      error_message TEXT,
      duration_ms INTEGER
    )
  `;
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        error_message TEXT,
        duration_ms INTEGER
      )
    `;
  } catch (error) {
    await db.sql`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        success INTEGER NOT NULL DEFAULT 1,
        error_message TEXT,
        duration_ms INTEGER
      )
    `;
  }
};
export const getExecutedMigrations = async (db, tableName) => {
  try {
    const result = await db.sql`SELECT * FROM \`${tableName}\` ORDER BY executed_at`;
    return result.rows || [];
  } catch {
    const result = await db.sql`SELECT * FROM "${tableName}" ORDER BY executed_at`;
    return result.rows || [];
  }
};
export const recordMigration = async (db, tableName, migration, success, duration, error) => {
  try {
    await db.sql`
      INSERT INTO \`${tableName}\` (filename, checksum, success, error_message, duration_ms)
      VALUES (${migration.filename}, ${migration.checksum}, ${success}, ${error || null}, ${duration})
    `;
  } catch {
    const successInt = success ? 1 : 0;
    await db.sql`
      INSERT INTO "${tableName}" (filename, checksum, success, error_message, duration_ms)
      VALUES (${migration.filename}, ${migration.checksum}, ${successInt}, ${error || null}, ${duration})
    `;
  }
};
export const executeMigration = async (db, migration) => {
  const startTime = Date.now();
  try {
    await db.sql`BEGIN`;
    const sqlParts = [migration.sql];
    await db.sql(sqlParts);
    await db.sql`COMMIT`;
    const duration = Date.now() - startTime;
    return {
      filename: migration.filename,
      success: true,
      duration
    };
  } catch (error) {
    try {
      await db.sql`ROLLBACK`;
    } catch {
    }
    const duration = Date.now() - startTime;
    return {
      filename: migration.filename,
      success: false,
      error: error.message,
      duration
    };
  }
};
export const isDatabaseEmpty = async (db, migrationsTable) => {
  try {
    const result = await db.sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_name != ${migrationsTable}
    `;
    return result.rows[0].count === 0;
  } catch {
    const result = await db.sql`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name != ${migrationsTable}
    `;
    return result.rows[0].count === 0;
  }
};
export const runMigrations = async (db, options) => {
  const config = useRuntimeConfig();
  const migrationDir = options?.dir || config.dbMigrations.dir;
  const tableName = options?.table || config.dbMigrations.table;
  const baseline = options?.baseline || config.dbMigrations.baseline;
  await ensureMigrationsTable(db, tableName);
  const allMigrations = await scanMigrations(migrationDir);
  const executedMigrations = await getExecutedMigrations(db, tableName);
  const executedFilenames = new Set(executedMigrations.map((m) => m.filename));
  const dbEmpty = await isDatabaseEmpty(db, tableName);
  if (dbEmpty && allMigrations.some((m) => m.filename === baseline)) {
    const baselineMigration = allMigrations.find((m) => m.filename === baseline);
    const baselineResult = await executeMigration(db, baselineMigration);
    await recordMigration(
      db,
      tableName,
      baselineMigration,
      baselineResult.success,
      baselineResult.duration,
      baselineResult.error
    );
    if (!baselineResult.success) {
      return [baselineResult];
    }
    executedFilenames.add(baseline);
  }
  const pendingMigrations = allMigrations.filter(
    (m) => !executedFilenames.has(m.filename) && m.filename !== baseline
  );
  const results = [];
  for (const migration of pendingMigrations) {
    const result = await executeMigration(db, migration);
    results.push(result);
    await recordMigration(
      db,
      tableName,
      migration,
      result.success,
      result.duration,
      result.error
    );
    if (!result.success) {
      break;
    }
  }
  return results;
};
