import { runMigrations } from "../database/runMigrations";

export default defineNitroPlugin(async () => {
  await runMigrations();
});
