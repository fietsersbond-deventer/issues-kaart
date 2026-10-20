import { mkdtempSync, realpathSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { configureEnvironment, provisionAccount } from '../scripts/setup-agent.mjs';

const directories: string[] = [];
function createCheckout() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'agent setup-')));
  directories.push(root);
  writeFileSync(join(root, '.env.example'), readFileSync('.env.example'));
  return root;
}
afterEach(() => {
  for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('agent environment', () => {
  it('creates private local configuration and preserves it on repeated setup', () => {
    const root = createCheckout();
    const environment = configureEnvironment(root);
    expect(environment.NUXT_DB_PATH).toBe(join(root, '.data/development.sqlite3'));
    expect(environment.NUXT_JWT_SECRET).toHaveLength(64);
    expect(environment.NUXT_SESSION_PASSWORD).not.toBe(environment.NUXT_JWT_SECRET);
    const original = readFileSync(join(root, '.env'), 'utf8');
    expect(configureEnvironment(root)).toEqual(environment);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe(original);
  });

  it('refuses invalid existing configuration without replacing it', () => {
    const root = createCheckout();
    writeFileSync(join(root, '.env'), 'NUXT_JWT_SECRET=placeholder\n');
    expect(() => configureEnvironment(root)).toThrow('NUXT_JWT_SECRET');
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('NUXT_JWT_SECRET=placeholder\n');
  });

  it('refuses external database paths and symlinked data directories', () => {
    const root = createCheckout();
    configureEnvironment(root);
    const envPath = join(root, '.env');
    writeFileSync(envPath, readFileSync(envPath, 'utf8').replace(join(root, '.data/development.sqlite3'), '/tmp/external.sqlite3'));
    expect(() => configureEnvironment(root)).toThrow('absolute file path');
    const other = createCheckout();
    mkdirSync(join(other, 'outside'));
    symlinkSync(join(other, 'outside'), join(other, '.data'));
    expect(() => configureEnvironment(other)).toThrow('symlink');
  });
});

describe('local account provisioning', () => {
  it('creates a usable admin once, preserves other users and detects credential mismatch', () => {
    const root = createCheckout();
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('CREATE TABLE users (username TEXT UNIQUE, name TEXT, role TEXT, password_hash TEXT)');
      db.exec("INSERT INTO users VALUES ('existing', 'Existing', 'user', 'unchanged')");
      const credentialsPath = join(root, 'local-login.json');
      provisionAccount(db, credentialsPath);
      const original = readFileSync(credentialsPath, 'utf8');
      provisionAccount(db, credentialsPath);
      expect(readFileSync(credentialsPath, 'utf8')).toBe(original);
      expect(db.prepare('SELECT count(*) AS count FROM users').get()?.count).toBe(2);
      expect(db.prepare("SELECT password_hash FROM users WHERE username = 'existing'").get()?.password_hash).toBe('unchanged');
      writeFileSync(credentialsPath, JSON.stringify({ username: 'agent@example.test', password: 'wrong' }));
      expect(() => provisionAccount(db, credentialsPath)).toThrow('do not match');
      rmSync(credentialsPath);
      expect(() => provisionAccount(db, credentialsPath)).toThrow('without credentials');
    } finally { db.close(); }
  });
});
