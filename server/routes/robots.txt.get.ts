export default defineEventHandler((event) => {
  const { url } = getSiteConfig(event);
  const sitemapUrl = new URL("/sitemap.xml", url).href;
  setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8");
  return `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`;
});
