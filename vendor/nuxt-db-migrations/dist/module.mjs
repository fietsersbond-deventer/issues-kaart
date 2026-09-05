import { defineNuxtModule, createResolver, addServerPlugin } from '@nuxt/kit';

const module$1 = defineNuxtModule({
  meta: {
    name: "nuxt-db-migrations",
    configKey: "dbMigrations",
    compatibility: {
      nuxt: ">=4.0.0"
    }
  },
  defaults: {
    dir: "./server/database/migrations",
    autoMigrate: true,
    table: "nuxt-db-migrations",
    lockTimeout: 3e4,
    baseline: "schema.sql"
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    nuxt.options.nitro = nuxt.options.nitro || {};
    nuxt.options.nitro.experimental = nuxt.options.nitro.experimental || {};
    nuxt.options.nitro.experimental.database = true;
    nuxt.options.nitro.experimental.tasks = true;
    nuxt.options.runtimeConfig.dbMigrations = {
      dir: options.dir,
      autoMigrate: options.autoMigrate,
      table: options.table,
      lockTimeout: options.lockTimeout,
      baseline: options.baseline
    };
    if (options.autoMigrate) {
      addServerPlugin(resolver.resolve("./runtime/server/plugins/auto-migrate"));
    }
  }
});

export { module$1 as default };
