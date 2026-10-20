import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { seedDatabase } from "./seed.js";
import { startMailSink } from "./mail.js";

// Never read a contributor's .env or database. Each invocation owns its directory.
const directory = mkdtempSync(join(tmpdir(), "issues-kaart-e2e-"));
const mailFile = join(directory, "mail.jsonl");
writeFileSync(mailFile, "");
const mailSink = await startMailSink(mailFile);
const environment = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  NODE_ENV: "production",
  NUXT_DB_PATH: join(directory, "test.sqlite3"),
  NUXT_JWT_SECRET: "e2e-only-jwt-secret-never-use-in-production",
  NUXT_SESSION_PASSWORD: "e2e-only-session-password-at-least-32-characters",
  AUTH_ORIGIN: "http://127.0.0.1:3100/api/auth",
  NUXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
  NUXT_PUBLIC_MAP_CENTER_LAT: "52.2511467",
  NUXT_PUBLIC_MAP_CENTER_LON: "6.1574997",
  NUXT_PUBLIC_MAP_INITIAL_ZOOM: "13",
  NUXT_PUBLIC_ORGANIZATION_NAME: "E2E Fietsersbond",
  NUXT_NODEMAILER_HOST: "127.0.0.1",
  NUXT_NODEMAILER_PORT: String(mailSink.port),
  NUXT_NODEMAILER_FROM: "E2E <test@example.test>",
  HOST: "127.0.0.1",
  PORT: "3100",
};
let child: ReturnType<typeof spawn> | undefined;
function cleanup() {
  child?.kill("SIGTERM");
  mailSink.server.close();
  rmSync(directory, { recursive: true, force: true });
}
process.once("SIGTERM", () => { cleanup(); process.exit(0); });
process.once("SIGINT", () => { cleanup(); process.exit(0); });
process.once("exit", cleanup);

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    child = spawn(command, args, { env: environment, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

// dotenv in the migration runner cannot override these explicitly set values.
await run("pnpm", ["exec", "tsx", "server/database/runMigrations.ts"]);
const db = new DatabaseSync(environment.NUXT_DB_PATH);
try {
  seedDatabase(db);
} finally {
  db.close();
}
await run("pnpm", ["exec", "nuxt", "build", "--dotenv", "/dev/null"]);
writeFileSync(".output/e2e-runtime.json", JSON.stringify({ directory, mailFile, dbPath: environment.NUXT_DB_PATH }));
await run(process.execPath, [".output/server/index.mjs"]);
