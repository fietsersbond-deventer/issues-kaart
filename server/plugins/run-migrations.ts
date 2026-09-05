import { runMigrations } from "../database/runMigrations";

export default defineNitroPlugin(() => {
  runMigrations();
});
