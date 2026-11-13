import { readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

export function runtime() {
  const state: { directory: string; dbPath: string; mailFile: string } =
    JSON.parse(readFileSync(".output/e2e-runtime.json", "utf8"));
  const prefix = join(realpathSync(tmpdir()), "issues-kaart-e2e-");
  if (
    !realpathSync(state.directory).startsWith(prefix) ||
    dirname(state.dbPath) !== state.directory ||
    dirname(state.mailFile) !== state.directory
  ) {
    throw new Error("Refusing access outside disposable E2E directory");
  }
  return state;
}
