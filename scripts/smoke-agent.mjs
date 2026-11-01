import { spawn } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { configureEnvironment } from './setup-agent.mjs';
import { DOMParser } from '@xmldom/xmldom';

/**
 * HTTP-controle van de productiebuild, als laatste stap van validate-agent.sh.
 * Dit script draait niet bij normaal starten of tijdens productiegebruik.
 *
 * Het start tijdelijk een eigen server, controleert publieke routes, sitemap,
 * SSR met browserheaders en ingelogde verzoeken, en stopt die server daarna.
 * Hiervoor moeten de build en het lokale adminaccount al beschikbaar zijn.
 *
 * Let op: dit gebruikt de lokale database uit de configuratie, geen aparte
 * testdatabase. De server voert migraties uit; login en tokenrotatie wijzigen
 * refresh-tokens. configureEnvironment kan een ontbrekende lokale .env aanmaken
 * en controleert bestaande configuratie zonder die te overschrijven.
 */
const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
let child;
// Beëindig alleen de server die dit script zelf heeft gestart, ook bij onderbreking.
function cleanup() { child?.kill('SIGTERM'); }
process.once('SIGINT', () => { cleanup(); process.exit(130); });
process.once('SIGTERM', () => { cleanup(); process.exit(143); });
try {
  const environment = configureEnvironment(root);
  // Stop als poort 3000 bezet is: we mogen niet per ongeluk een andere server testen.
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
  // Wacht begrensd op een werkende loginpagina, niet alleen op een geopend proces.
  while (true) {
    if (serverError) throw serverError;
    if (child.exitCode !== null) throw new Error('Smoke server exited before readiness.');
    try {
      const response = await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) break;
    } catch { /* Verbindingsfouten tijdens opstarten opnieuw proberen tot de deadline. */ }
    if (Date.now() >= deadline) throw new Error('Smoke server did not become ready within 30 seconds.');
    await delay(200);
  }
  for (const route of ['/', '/login', '/lijst', '/api/issues']) {
    const response = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(5000) });
    if (response.status !== 200) throw new Error(`Smoke failed: ${route} returned ${response.status}.`);
  }
  const sitemapSource = await fetch(`${baseUrl}/api/sitemap/urls`, { signal: AbortSignal.timeout(5000) });
  if (!sitemapSource.ok) throw new Error(`Sitemap source returned ${sitemapSource.status}.`);
  const sitemapUrls = await sitemapSource.json();
  const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
  if (!sitemapResponse.ok) throw new Error(`Sitemap returned ${sitemapResponse.status}.`);
  const sitemap = new DOMParser().parseFromString(await sitemapResponse.text(), 'application/xml');
  if (sitemap.documentElement.localName !== 'urlset') throw new Error('Sitemap is not a URL set.');
  const locations = Array.from(sitemap.getElementsByTagName('loc')).map((element) => element.textContent);
  const expectedPaths = ['/', '/kaart', '/lijst', ...sitemapUrls.map((entry) => entry.loc)].sort();
  // Vergelijk de XML met de actuele databasebron: ontbrekende én extra URL's zijn fouten.
  const paths = locations.map((location) => new URL(location).pathname).sort();
  if (JSON.stringify(paths) !== JSON.stringify(expectedPaths)) throw new Error('Sitemap does not match the public pages and current issue slugs.');
  const robotsResponse = await fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(5000) });
  if (!robotsResponse.ok) throw new Error(`Robots returned ${robotsResponse.status}.`);
  const sitemapOrigin = new URL(locations[0]).origin;
  if (!(await robotsResponse.text()).includes(`Sitemap: ${sitemapOrigin}/sitemap.xml`)) throw new Error('Robots does not advertise the configured sitemap.');
  const browserHeaders = {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'sec-ch-viewport-width': '1280',
    'sec-ch-viewport-height': '800',
  };
  // Client hints worden alleen voor ondersteunde browsers verwerkt. Een gewone
  // fetch zonder deze user-agent zou browser-specifieke SSR-fouten kunnen missen.
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
  // Neem Set-Cookie over zoals een browser dat doet. Twee opeenvolgende verzoeken
  // bewijzen dat SSR het vervangende refresh-token bewaart en niet het oude hergebruikt.
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
