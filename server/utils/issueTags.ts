import type { DatabaseSync } from "node:sqlite";

const MAX_TAG_LENGTH = 30;
const MAX_TAGS_PER_ISSUE = 10;

export function normalizeTag(tag: unknown): string | null {
  if (typeof tag !== "string") return null;

  const normalized = tag
    .trim()
    .toLowerCase()
    // Splits diacritische tekens in base letters + accenten, zodat í -> i.
    .normalize("NFD")
    // Verwijder diacritische tekens (accents) na de normalisatie.
    .replace(/[\u0300-\u036f]/g, "")
    // Vervang groepen van niet-alfanumerieke tekens door een enkele streep.
    .replace(/[^a-z0-9]+/g, "-")
    // Verwijder streepjes aan het begin of einde van de tag.
    .replace(/^-+|-+$/g, "")
    // Verminder meerdere streepjes achter elkaar tot één.
    .replace(/-{2,}/g, "-")
    // Beperk de tag tot de maximale lengte.
    .slice(0, MAX_TAG_LENGTH)
    // Verwijder eventueel een streepje aan het einde na truncatie.
    .replace(/-+$/g, "");

  return normalized || null;
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  const normalizedTags = tags
    .map((tag) => normalizeTag(tag))
    .filter((tag): tag is string => Boolean(tag));

  return [...new Set(normalizedTags)].slice(0, MAX_TAGS_PER_ISSUE);
}

export function getTagsForIssueIds(
  db: DatabaseSync,
  issueIds: Array<number | string>,
): Map<number, string[]> {
  const ids = issueIds.map(Number).filter((id) => Number.isInteger(id));
  const tagsByIssueId = new Map<number, string[]>();

  ids.forEach((id) => tagsByIssueId.set(id, []));
  if (ids.length === 0) return tagsByIssueId;

  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT issue_id, tag
       FROM issue_tags
       WHERE issue_id IN (${placeholders})
       ORDER BY tag ASC`,
    )
    .all(...ids) as { issue_id: number; tag: string }[];

  for (const row of rows) {
    const issueTags = tagsByIssueId.get(row.issue_id) ?? [];
    issueTags.push(row.tag);
    tagsByIssueId.set(row.issue_id, issueTags);
  }

  return tagsByIssueId;
}

export function getTagsForIssueId(
  db: DatabaseSync,
  issueId: number | string,
): string[] {
  return getTagsForIssueIds(db, [issueId]).get(Number(issueId)) ?? [];
}

export function replaceTagsForIssue(
  db: DatabaseSync,
  issueId: number | string,
  tags: unknown,
) {
  const normalizedTags = normalizeTags(tags);
  const numericIssueId = Number(issueId);

  db.prepare("DELETE FROM issue_tags WHERE issue_id = ?").run(numericIssueId);

  const insertTag = db.prepare(
    "INSERT OR IGNORE INTO issue_tags (issue_id, tag) VALUES (?, ?)",
  );
  for (const tag of normalizedTags) {
    insertTag.run(numericIssueId, tag);
  }

  return normalizedTags;
}
