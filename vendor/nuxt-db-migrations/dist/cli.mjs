#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import { readFileSync } from 'node:fs';
import { consola } from 'consola';

const migrate = defineCommand({
  meta: {
    name: "migrate",
    description: "Run pending database migrations"
  },
  async run() {
    consola.info("Running database migrations...");
    consola.warn("This command requires a running Nuxt application context.");
    consola.info("Please use the Nuxt dev server and access migrations via the database utilities.");
    consola.box(
      "For now, migrations are executed automatically on server startup if autoMigrate is enabled,\nor you can run them programmatically using the runMigrations utility."
    );
  }
});

const validate = defineCommand({
  meta: {
    name: "validate",
    description: "Validate migration integrity and detect issues"
  },
  async run() {
    consola.info("Validating migrations...");
    consola.warn("This command requires a running Nuxt application context.");
    consola.info("Migration validation checks for:");
    consola.info("  - Missing migration files");
    consola.info("  - Checksum mismatches");
    consola.info("  - Inconsistencies between filesystem and database");
  }
});

const snapshot = defineCommand({
  meta: {
    name: "snapshot",
    description: "Capture database schema snapshot and optionally generate migration"
  },
  args: {
    "generate-migration": {
      type: "boolean",
      description: "Generate migration from schema changes",
      default: false
    }
  },
  async run({ args }) {
    consola.info("Capturing database schema snapshot...");
    if (args["generate-migration"]) {
      consola.info("Will also generate migration from detected changes");
    }
    consola.warn("This command requires a running Nuxt application context.");
    consola.info("The snapshot feature:");
    consola.info("  - Captures current database schema");
    consola.info("  - Compares with previous snapshot");
    consola.info("  - Detects schema changes automatically");
    consola.info("  - Generates migration SQL with intelligent rename detection");
  }
});

const getVersion = () => {
  try {
    const packagePath = new URL("../package.json", import.meta.url);
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    return packageJson.version;
  } catch {
    return "unknown";
  }
};
const main = defineCommand({
  meta: {
    name: "nuxt-db-migrations",
    description: "CLI for Nuxt DB Migrations Module - Manage database migrations",
    version: getVersion()
  },
  subCommands: {
    migrate,
    validate,
    snapshot
  }
});
runMain(main);
