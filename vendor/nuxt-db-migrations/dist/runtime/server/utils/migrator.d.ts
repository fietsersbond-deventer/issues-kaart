export interface Migration {
    filename: string;
    timestamp: string;
    description: string;
    sql: string;
    checksum: string;
}
export interface MigrationRecord {
    id: number;
    filename: string;
    checksum: string;
    executed_at: string;
    success: boolean;
    error_message?: string;
}
export interface MigrationResult {
    filename: string;
    success: boolean;
    error?: string;
    duration: number;
}
/**
 * Scan migration directory for .sql files
 */
export declare const scanMigrations: (migrationDir: string) => Promise<Migration[]>;
/**
 * Generate checksum for migration content
 */
export declare const generateChecksum: (content: string) => string;
/**
 * Ensure migrations tracking table exists
 */
export declare const ensureMigrationsTable: (db: any, tableName: string) => Promise<void>;
/**
 * Get executed migrations from database
 */
export declare const getExecutedMigrations: (db: any, tableName: string) => Promise<MigrationRecord[]>;
/**
 * Record migration execution in database
 */
export declare const recordMigration: (db: any, tableName: string, migration: Migration, success: boolean, duration: number, error?: string) => Promise<void>;
/**
 * Execute a single migration within a transaction
 */
export declare const executeMigration: (db: any, migration: Migration) => Promise<MigrationResult>;
/**
 * Check if database is empty (no tables except migrations table)
 */
export declare const isDatabaseEmpty: (db: any, migrationsTable: string) => Promise<boolean>;
/**
 * Run pending migrations
 */
export declare const runMigrations: (db: any, options?: {
    dir?: string;
    table?: string;
    baseline?: string;
}) => Promise<MigrationResult[]>;
