import type { DatabaseSync } from "node:sqlite";
import { slugify } from "~~/shared/utils/slug";

export function createUniqueIssueSlug(
  db: DatabaseSync,
  value: string,
  excludedIssueId?: number,
): string {
  const baseSlug = slugify(value);
  const isTaken = db.prepare(
    `SELECT 1 FROM issues WHERE slug = ?${excludedIssueId === undefined ? "" : " AND id != ?"}`,
  );
  const hasSlug = (slug: string) =>
    Boolean(
      excludedIssueId === undefined
        ? isTaken.get(slug)
        : isTaken.get(slug, excludedIssueId),
    );

  if (!hasSlug(baseSlug)) return baseSlug;

  const stem = baseSlug.replace(/-\d+$/, "") || baseSlug;
  if (!hasSlug(stem)) return stem;

  let suffix = 2;
  while (hasSlug(`${stem}-${suffix}`)) suffix++;
  return `${stem}-${suffix}`;
}

export function getIssueIdFromIdentifier(
  db: DatabaseSync,
  identifier: string,
): number | null {
  if (/^\d+$/.test(identifier)) {
    const numericId = Number(identifier);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      const byId = db.prepare("SELECT id FROM issues WHERE id = ?").get(numericId) as
        | { id: number }
        | undefined;
      if (byId) return byId.id;
    }
  }

  const bySlug = db
    .prepare("SELECT id FROM issues WHERE slug = ?")
    .get(identifier) as { id: number } | undefined;
  return bySlug?.id ?? null;
}
