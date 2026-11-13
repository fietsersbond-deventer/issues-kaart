import type { SitemapUrlInput } from "#sitemap/types";
import { getDb } from "../../utils/db";

export default defineEventHandler((): SitemapUrlInput[] => {
  const issues = getDb()
    .prepare("SELECT slug FROM issues WHERE slug IS NOT NULL AND slug != '' AND slug != 'new' ORDER BY slug")
    .all();

  return issues.map(({ slug }) => {
    if (typeof slug !== "string") {
      throw new Error("Ongeldige slug in de sitemapgegevens");
    }
    return { loc: `/kaart/${encodeURIComponent(slug)}` };
  });
});
