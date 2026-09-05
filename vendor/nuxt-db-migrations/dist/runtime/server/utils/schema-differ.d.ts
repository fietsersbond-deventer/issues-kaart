export interface ColumnSchema {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue: string | null;
    position: number;
}
export interface IndexSchema {
    name: string;
    columns: string[];
    unique: boolean;
}
export interface TableSchema {
    name: string;
    columns: ColumnSchema[];
    indexes: IndexSchema[];
}
export interface DatabaseSchema {
    tables: TableSchema[];
    timestamp: string;
}
export interface SchemaChange {
    type: 'add_table' | 'drop_table' | 'add_column' | 'drop_column' | 'modify_column' | 'add_index' | 'drop_index' | 'rename_column';
    table: string;
    details: Record<string, any>;
    confidence?: number;
}
/**
 * Get current database schema
 */
export declare const captureSchema: (db: any, excludeTables?: string[]) => Promise<DatabaseSchema>;
/**
 * Save schema snapshot to file
 */
export declare const saveSnapshot: (schema: DatabaseSchema, snapshotPath: string) => Promise<string>;
/**
 * Load schema snapshot from file
 */
export declare const loadSnapshot: (snapshotPath: string) => Promise<DatabaseSchema | null>;
/**
 * Compare two schemas and detect changes
 */
export declare const compareSchemas: (oldSchema: DatabaseSchema, newSchema: DatabaseSchema) => SchemaChange[];
/**
 * Generate SQL from schema changes
 */
export declare const generateMigrationSQL: (changes: SchemaChange[], userDecisions?: Map<string, "rename" | "drop_add" | "skip">) => string;
