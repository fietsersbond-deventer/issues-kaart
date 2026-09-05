import * as _nuxt_schema from '@nuxt/schema';

interface ModuleOptions {
    /**
     * Directory where migration files are stored
     * @default './server/database/migrations'
     */
    dir: string;
    /**
     * Automatically run migrations on server startup
     * @default true
     */
    autoMigrate: boolean;
    /**
     * Name of the table to track migration history
     * @default 'nuxt-db-migrations'
     */
    table: string;
    /**
     * Timeout for acquiring migration lock (in milliseconds)
     * @default 30000
     */
    lockTimeout: number;
    /**
     * Name of the baseline schema file
     * @default 'schema.sql'
     */
    baseline: string;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

export { _default as default };
export type { ModuleOptions };
