import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { parse } from 'dotenv';
import bcrypt from 'bcryptjs';

export function configureEnvironment(root) {
  const dataPath = join(root, '.data');
  mkdirSync(dataPath, { recursive: true });
  if (realpathSync(dataPath) !== dataPath) throw new Error('.data must not be a symlink.');
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) {
    const template = readFileSync(join(root, '.env.example'), 'utf8');
    const content = template
      .replace('<randomly generated strong password>', randomBytes(32).toString('hex'))
      .replace('<randomly generated strong secret>', randomBytes(32).toString('hex'))
      .replace('<your-postmark-api-key-here>', '')
      .replace('NUXT_DB_PATH=/path/to/fietsersbond.sqlite3', `NUXT_DB_PATH=${JSON.stringify(join(dataPath, 'development.sqlite3'))}`);
    writeFileSync(envPath, `${content}\nAUTH_ORIGIN=http://localhost:3000/api/auth\n`, { flag: 'wx', mode: 0o600 });
  }
  const environment = parse(readFileSync(envPath));
  for (const key of ['NUXT_JWT_SECRET', 'NUXT_SESSION_PASSWORD']) {
    if (!environment[key] || environment[key].length < 32 || /<.*>/.test(environment[key])) {
      throw new Error(`Set a local ${key} of at least 32 characters in .env.`);
    }
  }
  const dbPath = environment.NUXT_DB_PATH;
  if (!dbPath || dirname(dbPath) !== dataPath || resolve(dbPath) !== dbPath) {
    throw new Error('NUXT_DB_PATH must be an absolute file path directly inside this checkout’s .data.');
  }
  if (existsSync(dbPath) && realpathSync(dbPath) !== dbPath) throw new Error('Database must not be a symlink.');
  if (process.env.NUXT_DB_PATH && process.env.NUXT_DB_PATH !== dbPath) {
    throw new Error('Inherited NUXT_DB_PATH differs from .env; unset it before setup.');
  }
  return environment;
}

export function provisionAccount(db, credentialsPath) {
  const username = 'agent@example.test';
  const user = db.prepare('SELECT username, role, password_hash FROM users WHERE username = ?').get(username);
  if (existsSync(credentialsPath)) {
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    if (!user || credentials.username !== username || typeof credentials.password !== 'string' || user.role !== 'admin' || !bcrypt.compareSync(credentials.password, user.password_hash)) {
      throw new Error('Local account and .data/local-login.json do not match; resolve manually.');
    }
    return;
  }
  if (user) throw new Error('Local account exists without credentials; no password was changed.');
  const password = randomBytes(24).toString('base64url');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO users (username, name, role, password_hash) VALUES (?, ?, ?, ?)')
      .run(username, 'Local Agent', 'admin', bcrypt.hashSync(password, 12));
    writeFileSync(credentialsPath, `${JSON.stringify({ username, password }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
    const environment = configureEnvironment(root);
    const migration = spawnSync('pnpm', ['run', 'migrate'], {
      cwd: root, env: { ...process.env, ...environment }, stdio: 'inherit',
    });
    if (migration.error) throw migration.error;
    if (migration.status !== 0) throw new Error('Migration failed; setup stopped.');
    const db = new DatabaseSync(environment.NUXT_DB_PATH);
    try {
      provisionAccount(db, join(root, '.data/local-login.json'));
    } finally {
      db.close();
    }
    console.log('Setup complete. Credentials: .data/local-login.json. Start: pnpm run dev');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
