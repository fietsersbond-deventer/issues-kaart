# Nuxt DB Migrations

A Nuxt module for managing database migrations without requiring an ORM. Built following Nuxt conventions and best practices, this module provides a complete migration system with intelligent schema detection, CLI tools, and safety mechanisms.

## Features

## 1. Schema Lifecycle Management

- Initialization (Baseline): The ability to detect if the database is empty and run a "starting schema" (e.g., schema.sql) before applying individual incremental migrations.
- Version Tracking: Automatically create and manage a nuxt-db-migrations table to track which SQL files have already been executed.
- Deterministic Execution: A strict sorting mechanism (timestamp) to ensure migrations always run in the same order across all environments.

## 2. Developer Experience (DX)

### Auto-Scanning
- Automatically scans a configurable directory (e.g., `server/database/migrations`) for `.sql` files
- No manual registration required
- Timestamp-based deterministic ordering (`YYYYMMDDHHMMSS_description.sql`)

### CLI Commands (Nitro Tasks)

Tasks can be executed via HTTP endpoints (recommended for development) or using the Nitro CLI (requires production build).

#### Option 1: HTTP Endpoints (Recommended for Development)

When the dev server is running, use HTTP endpoints via `curl` or any HTTP client:

```bash
# Run migrations
curl -X POST http://localhost:3000/_nitro/tasks/migrate

# Validate migrations
curl -X POST http://localhost:3000/_nitro/tasks/validate

# Create snapshot
curl -X POST http://localhost:3000/_nitro/tasks/snapshot

# List all available tasks
curl http://localhost:3000/_nitro/tasks
```

#### Option 2: Nitro CLI (For Production Builds)

**Important**: The `npx nitro task run` command requires a built Nitro instance or the dev server to be fully initialized with a `.nitro` directory. For development, prefer the HTTP endpoints above.

#### Task Details

**`db:migrate`**
- Execute pending database migrations
- Shows progress with clear output (✓ success, ✗ failure)
- Provides summary: total migrations, successful, failed
- Exits with appropriate status code for CI/CD integration

**`db:snapshot`**
- Captures current database schema state (tables, columns, indexes)
- Saves timestamped JSON snapshot
- With `generateMigration` payload parameter:
  - Compares with previous snapshot
  - Detects schema changes automatically
  - **Intelligent Ambiguity Resolution**: When detecting potentially ambiguous changes (e.g., column rename vs drop+add):
    - Uses heuristics (name similarity via Levenshtein distance, column position, type compatibility)
    - Prompts user interactively for confirmation
    - Shows side-by-side comparison of old/new definitions
    - Allows skip to decide later
  - Generates SQL migration file with user decisions recorded in comments
  - Supports `--no-interaction` flag for CI/CD (uses safe defaults with warnings)

**`db:validate`**
- Checks migration integrity
- Detects missing migration files (gaps)
- Detects checksum mismatches
- Reports inconsistencies with clear warnings

**Example with payload** (snapshot with migration generation):
```bash
curl -X POST http://localhost:3000/_nitro/tasks/snapshot \
  -H "Content-Type: application/json" \
  -d '{"payload": {"generateMigration": true}}'
```

### Smart Schema Detection
The snapshot system intelligently handles:
- **Unambiguous changes**: New/dropped tables, new/dropped columns, type changes for same-named columns, index modifications
- **Ambiguous changes**: Potential renames, significant type/constraint changes
- **Interactive prompts**: "Did you rename 'user_email' to 'email'? [Y/n/skip]"
- **Audit trail**: All user decisions and warnings recorded in generated migration files
- **Safe defaults**: In non-interactive mode, defaults to drop+add with TODO comments

## 3. Build & Environment Compatibility

- **Driver Agnostic**: Uses Nuxt's `useDatabase()` composable exclusively
- Works with SQLite, PostgreSQL, and MySQL without code changes
- **Configurable Directory**: Change migration folder path via `nuxt.config.ts` options
- Follows Nuxt 4 conventions with `server/tasks/` directory structure

## 4. Safety & Reliability

- Transaction Wrapping: Automatically wrap each migration file in a BEGIN / COMMIT block to ensure that if a single statement fails, the database doesn't end up in a "half-migrated" state.
- Error Reporting: Provide clear console output indicating exactly which file failed and at which line (if the driver provides it).
- Locking Mechanism: (Advanced) For scaled applications, a "migration lock" to prevent two server instances from trying to run the same migrations simultaneously during a deployment.

## 5. Module Options (Config Example)

Configure the module in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-db-migrations'],
  dbMigrations: {
    dir: './server/database/migrations',  // Where the .sql files live
    autoMigrate: true,                    // Run on server start?
    table: 'nuxt-db-migrations',         // Custom tracking table name
    lockTimeout: 30000,                   // Migration lock timeout (ms)
    baseline: 'schema.sql',               // Baseline schema file name
  }
})
```

## Implementation Approach

- **Nuxt 4 Module**: Built using `@nuxt/module-builder` and `@nuxt/kit`
- **Server Tasks**: Leverages Nuxt's native task system for CLI commands
- **Functional Programming**: Follows functional approach (no classes/constructors)
- **Testing**: Comprehensive unit and integration tests using Vitest with SQLite
- **Type Safety**: Full TypeScript support with proper type exports

## Migration File Format

Migrations follow a timestamp-based naming convention:

```
20231201120000_add_users_table.sql
20231201130000_add_posts_table.sql
```

Auto-generated migrations include:
- Comment headers with detection timestamp and method
- User decisions recorded: `-- User confirmed: renamed user_email -> email`
- Warnings for data-destructive operations
- TODO comments for skipped ambiguities
- Rollback hints where applicable

## Future Enhancements

- VFS support for edge/Cloudflare Workers deployment
- Migration rollback capability
- Migration dry-run mode
- Support for seed data files
- Migration history visualization

## Documentation

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed technical design and implementation strategy.
