import { spawn } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { configureEnvironment } from './setup-agent.mjs';

const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
let child;
function cleanup() { child?.kill('SIGTERM'); }
process.once('SIGINT', () => { cleanup(); process.exit(130); });
process.once('SIGTERM', () => { cleanup(); process.exit(143); });
try {
  const environment = configureEnvironment(root);
  // Refuse to validate an unrelated server already listening on our port.
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(3000, '127.0.0.1', () => probe.close(resolve));
  });
  child = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: root,
    env: { ...process.env, ...environment, HOST: '127.0.0.1', PORT: '3000', NODE_ENV: 'production' },
    stdio: 'ignore',
  });
  let serverError;
  child.once('error', (error) => { serverError = error; });
  const baseUrl = 'http://127.0.0.1:3000';
  const deadline = Date.now() + 30_000;
  while (true) {
    if (serverError) throw serverError;
    if (child.exitCode !== null) throw new Error('Smoke server exited before readiness.');
    try {
      const response = await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) break;
    } catch { /* Retry until the bounded readiness deadline. */ }
    if (Date.now() >= deadline) throw new Error('Smoke server did not become ready within 30 seconds.');
    await delay(200);
  }
  for (const route of ['/', '/login', '/lijst', '/api/issues']) {
    const response = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(5000) });
    if (response.status !== 200) throw new Error(`Smoke failed: ${route} returned ${response.status}.`);
  }
  const browserHeaders = {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'sec-ch-viewport-width': '1280',
    'sec-ch-viewport-height': '800',
  };
  for (const route of ['/lijst', '/kaart']) {
    const page = await fetch(`${baseUrl}${route}`, {
      headers: browserHeaders, signal: AbortSignal.timeout(5000),
    });
    if (page.status !== 200) throw new Error(`Browser SSR failed: ${route} returned ${page.status}.`);
    if (!page.headers.get('accept-ch')?.toLowerCase().includes('sec-ch-viewport-width')) {
      throw new Error(`Browser SSR did not advertise viewport client hints: ${route}.`);
    }
    await page.text();
  }
  const credentials = JSON.parse(readFileSync(join(root, '.data/local-login.json'), 'utf8'));
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(credentials), signal: AbortSignal.timeout(5000),
  });
  const body = await response.json();
  if (response.status !== 200 || !body.token || body.user?.role !== 'admin') throw new Error('Local admin login failed.');
  const cookies = { 'auth.token': body.token, 'auth.refresh-token': body.refreshToken };
  for (let request = 0; request < 2; request++) {
    const previousRefreshToken = cookies['auth.refresh-token'];
    const page = await fetch(`${baseUrl}/lijst`, {
      headers: { ...browserHeaders, cookie: Object.entries(cookies).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ') },
      signal: AbortSignal.timeout(5000),
    });
    if (page.status !== 200) throw new Error(`Authenticated list returned ${page.status}.`);
    for (const header of page.headers.getSetCookie()) {
      const pair = header.split(';', 1)[0];
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      if (Object.hasOwn(cookies, name)) cookies[name] = decodeURIComponent(pair.slice(separator + 1));
    }
    if (!cookies['auth.token'] || !cookies['auth.refresh-token'] || cookies['auth.refresh-token'] === previousRefreshToken) {
      throw new Error('SSR did not preserve rotated authentication cookies.');
    }
    await page.text();
  }
  console.log('HTTP smoke passed: homepage, login, list, issues API, admin login and SSR token rotation.');
} catch (error) {
  console.error(`HTTP smoke failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
