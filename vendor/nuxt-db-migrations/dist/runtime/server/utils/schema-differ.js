import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
export const captureSchema = async (db, excludeTables = []) => {
  const tables = [];
  try {
    const tablesResult = await db.sql(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `);
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.name;
      if (excludeTables.includes(tableName)) {
        continue;
      }
      const columnsResult = await db.sql(`PRAGMA table_info("${tableName}")`);
      const columns = columnsResult.rows.map((col) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        defaultValue: col.dflt_value,
        position: col.cid
      }));
      const indexesResult = await db.sql(`PRAGMA index_list("${tableName}")`);
      const indexes = [];
      for (const indexRow of indexesResult.rows) {
        const indexName = indexRow.name;
        const indexInfoResult = await db.sql(`PRAGMA index_info("${indexName}")`);
        indexes.push({
          name: indexName,
          columns: indexInfoResult.rows.map((col) => col.name),
          unique: indexRow.unique === 1
        });
      }
      tables.push({
        name: tableName,
        columns,
        indexes
      });
    }
  } catch {
    const tablesResult = await db.sql(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      if (excludeTables.includes(tableName)) {
        continue;
      }
      const columnsResult = await db.sql(`
        SELECT column_name, data_type, is_nullable, column_default, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = ?
        ORDER BY ordinal_position
      `, [tableName]);
      const columns = columnsResult.rows.map((col) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === "YES",
        defaultValue: col.column_default,
        position: col.ordinal_position
      }));
      const indexesResult = await db.sql(`
        SELECT 
          index_name,
          column_name,
          non_unique
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
        AND table_name = ?
        ORDER BY index_name, seq_in_index
      `, [tableName]);
      const indexMap = /* @__PURE__ */ new Map();
      for (const indexRow of indexesResult.rows) {
        if (!indexMap.has(indexRow.index_name)) {
          indexMap.set(indexRow.index_name, {
            name: indexRow.index_name,
            columns: [],
            unique: indexRow.non_unique === 0
          });
        }
        indexMap.get(indexRow.index_name).columns.push(indexRow.column_name);
      }
      tables.push({
        name: tableName,
        columns,
        indexes: Array.from(indexMap.values())
      });
    }
  }
  return {
    tables,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
};
export const saveSnapshot = async (schema, snapshotPath) => {
  const dir = dirname(snapshotPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(snapshotPath, JSON.stringify(schema, null, 2), "utf-8");
  return snapshotPath;
};
export const loadSnapshot = async (snapshotPath) => {
  if (!existsSync(snapshotPath)) {
    return null;
  }
  const content = await readFile(snapshotPath, "utf-8");
  return JSON.parse(content);
};
const levenshteinDistance = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      }
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + 1
      );
    }
  }
  return matrix[len1][len2];
};
const calculateSimilarity = (str1, str2) => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
};
const detectPossibleRename = (oldCol, newCol, oldTable, newTable) => {
  const nameSimilarity = calculateSimilarity(oldCol.name, newCol.name);
  const typeMatch = oldCol.type.toLowerCase() === newCol.type.toLowerCase() ? 1 : 0;
  const positionDiff = Math.abs(oldCol.position - newCol.position);
  const maxPosition = Math.max(oldTable.columns.length, newTable.columns.length);
  const positionSimilarity = 1 - positionDiff / maxPosition;
  const confidence = nameSimilarity * 0.5 + typeMatch * 0.3 + positionSimilarity * 0.2;
  return confidence;
};
export const compareSchemas = (oldSchema, newSchema) => {
  const changes = [];
  const oldTableMap = new Map(oldSchema.tables.map((t) => [t.name, t]));
  const newTableMap = new Map(newSchema.tables.map((t) => [t.name, t]));
  for (const oldTable of oldSchema.tables) {
    if (!newTableMap.has(oldTable.name)) {
      changes.push({
        type: "drop_table",
        table: oldTable.name,
        details: { tableName: oldTable.name }
      });
    }
  }
  for (const newTable of newSchema.tables) {
    if (!oldTableMap.has(newTable.name)) {
      changes.push({
        type: "add_table",
        table: newTable.name,
        details: {
          tableName: newTable.name,
          columns: newTable.columns
        }
      });
    }
  }
  for (const newTable of newSchema.tables) {
    const oldTable = oldTableMap.get(newTable.name);
    if (!oldTable) {
      continue;
    }
    const oldColMap = new Map(oldTable.columns.map((c) => [c.name, c]));
    const newColMap = new Map(newTable.columns.map((c) => [c.name, c]));
    const droppedCols = [];
    const addedCols = [];
    for (const oldCol of oldTable.columns) {
      if (!newColMap.has(oldCol.name)) {
        droppedCols.push(oldCol);
      }
    }
    for (const newCol of newTable.columns) {
      if (!oldColMap.has(newCol.name)) {
        addedCols.push(newCol);
      }
    }
    const processedDrops = /* @__PURE__ */ new Set();
    const processedAdds = /* @__PURE__ */ new Set();
    for (const droppedCol of droppedCols) {
      let bestMatch = null;
      for (const addedCol of addedCols) {
        if (processedAdds.has(addedCol.name)) {
          continue;
        }
        const confidence = detectPossibleRename(droppedCol, addedCol, oldTable, newTable);
        if (confidence > 0.7 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { col: addedCol, confidence };
        }
      }
      if (bestMatch) {
        changes.push({
          type: "rename_column",
          table: newTable.name,
          details: {
            oldName: droppedCol.name,
            newName: bestMatch.col.name,
            oldColumn: droppedCol,
            newColumn: bestMatch.col
          },
          confidence: bestMatch.confidence
        });
        processedDrops.add(droppedCol.name);
        processedAdds.add(bestMatch.col.name);
      }
    }
    for (const droppedCol of droppedCols) {
      if (!processedDrops.has(droppedCol.name)) {
        changes.push({
          type: "drop_column",
          table: newTable.name,
          details: { columnName: droppedCol.name, column: droppedCol }
        });
      }
    }
    for (const addedCol of addedCols) {
      if (!processedAdds.has(addedCol.name)) {
        changes.push({
          type: "add_column",
          table: newTable.name,
          details: { column: addedCol }
        });
      }
    }
    for (const newCol of newTable.columns) {
      const oldCol = oldColMap.get(newCol.name);
      if (oldCol && (oldCol.type !== newCol.type || oldCol.nullable !== newCol.nullable || oldCol.defaultValue !== newCol.defaultValue)) {
        changes.push({
          type: "modify_column",
          table: newTable.name,
          details: {
            columnName: newCol.name,
            oldColumn: oldCol,
            newColumn: newCol
          }
        });
      }
    }
    const oldIndexMap = new Map(oldTable.indexes.map((i) => [i.name, i]));
    const newIndexMap = new Map(newTable.indexes.map((i) => [i.name, i]));
    for (const oldIndex of oldTable.indexes) {
      if (!newIndexMap.has(oldIndex.name)) {
        changes.push({
          type: "drop_index",
          table: newTable.name,
          details: { index: oldIndex }
        });
      }
    }
    for (const newIndex of newTable.indexes) {
      if (!oldIndexMap.has(newIndex.name)) {
        changes.push({
          type: "add_index",
          table: newTable.name,
          details: { index: newIndex }
        });
      }
    }
  }
  return changes;
};
export const generateMigrationSQL = (changes, userDecisions = /* @__PURE__ */ new Map()) => {
  const lines = [];
  lines.push("-- Auto-generated migration");
  lines.push(`-- Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  lines.push("");
  for (const change of changes) {
    switch (change.type) {
      case "add_table": {
        lines.push(`-- Add table: ${change.details.tableName}`);
        lines.push(`CREATE TABLE "${change.details.tableName}" (`);
        const colDefs = change.details.columns.map((col) => {
          let def = `  "${col.name}" ${col.type}`;
          if (!col.nullable) def += " NOT NULL";
          if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
          return def;
        });
        lines.push(colDefs.join(",\n"));
        lines.push(");");
        lines.push("");
        break;
      }
      case "drop_table": {
        lines.push(`-- Drop table: ${change.details.tableName}`);
        lines.push(`-- WARNING: This will delete all data in the table`);
        lines.push(`DROP TABLE IF EXISTS "${change.details.tableName}";`);
        lines.push("");
        break;
      }
      case "add_column": {
        const col = change.details.column;
        lines.push(`-- Add column: ${change.table}.${col.name}`);
        let sql = `ALTER TABLE "${change.table}" ADD COLUMN "${col.name}" ${col.type}`;
        if (!col.nullable) sql += " NOT NULL";
        if (col.defaultValue) sql += ` DEFAULT ${col.defaultValue}`;
        lines.push(`${sql};`);
        lines.push("");
        break;
      }
      case "drop_column": {
        lines.push(`-- Drop column: ${change.table}.${change.details.columnName}`);
        lines.push(`-- WARNING: This will delete all data in the column`);
        lines.push(`ALTER TABLE "${change.table}" DROP COLUMN "${change.details.columnName}";`);
        lines.push("");
        break;
      }
      case "rename_column": {
        const decision = userDecisions.get(`${change.table}.${change.details.oldName}`);
        if (decision === "skip") {
          lines.push(`-- TODO: Decide how to handle ${change.table}.${change.details.oldName} -> ${change.details.newName}`);
          lines.push(`-- Confidence: ${((change.confidence || 0) * 100).toFixed(0)}%`);
          lines.push("");
          continue;
        }
        if (decision === "rename" || decision === void 0 && (change.confidence || 0) > 0.85) {
          lines.push(`-- Rename column: ${change.table}.${change.details.oldName} -> ${change.details.newName}`);
          lines.push(`-- User confirmed: renamed (confidence: ${((change.confidence || 0) * 100).toFixed(0)}%)`);
          lines.push(`ALTER TABLE "${change.table}" RENAME COLUMN "${change.details.oldName}" TO "${change.details.newName}";`);
        }
        if (decision === "drop_add") {
          lines.push(`-- Drop and add column: ${change.table}.${change.details.oldName} -> ${change.details.newName}`);
          lines.push(`-- User confirmed: drop + add (data will be lost)`);
          lines.push(`-- WARNING: This will delete all data in the column`);
          lines.push(`ALTER TABLE "${change.table}" DROP COLUMN "${change.details.oldName}";`);
          const newCol = change.details.newColumn;
          let sql = `ALTER TABLE "${change.table}" ADD COLUMN "${newCol.name}" ${newCol.type}`;
          if (!newCol.nullable) sql += " NOT NULL";
          if (newCol.defaultValue) sql += ` DEFAULT ${newCol.defaultValue}`;
          lines.push(`${sql};`);
        }
        lines.push("");
        break;
      }
      case "modify_column": {
        const oldCol = change.details.oldColumn;
        const newCol = change.details.newColumn;
        lines.push(`-- Modify column: ${change.table}.${newCol.name}`);
        lines.push(`-- Old: ${oldCol.type}, nullable: ${oldCol.nullable}, default: ${oldCol.defaultValue}`);
        lines.push(`-- New: ${newCol.type}, nullable: ${newCol.nullable}, default: ${newCol.defaultValue}`);
        lines.push(`-- TODO: Add appropriate ALTER COLUMN statement for your database`);
        lines.push("");
        break;
      }
      case "add_index": {
        const index = change.details.index;
        const unique = index.unique ? "UNIQUE " : "";
        lines.push(`-- Add index: ${index.name}`);
        lines.push(`CREATE ${unique}INDEX "${index.name}" ON "${change.table}" (${index.columns.map((c) => `"${c}"`).join(", ")});`);
        lines.push("");
        break;
      }
      case "drop_index": {
        const index = change.details.index;
        lines.push(`-- Drop index: ${index.name}`);
        lines.push(`DROP INDEX IF EXISTS "${index.name}";`);
        lines.push("");
        break;
      }
    }
  }
  return lines.join("\n");
};
