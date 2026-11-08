import { getDb } from "~~/server/utils/db";

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const match = url.pathname.match(/^\/kaart\/(\d+)$/);

  if (!match) return;

  const numericId = match[1];
  const db = getDb();

  const issue = db
    .prepare("SELECT id, slug FROM issues WHERE id = ?")
    .get(Number(numericId)) as { id: number; slug: string } | undefined;

  if (issue && issue.slug) {
    const query = url.search ? url.search : "";
    sendRedirect(event, `/kaart/${issue.slug}${query}`, 302);
  }
});
