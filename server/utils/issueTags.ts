import type { DatabaseSync } from "node:sqlite";
import type { Tag } from "~~/shared/types/Tag";

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

export function ensureTagMetadata(db: DatabaseSync, tags: unknown): string[] {
  const normalizedTags = normalizeTags(tags);

  if (normalizedTags.length === 0) return [];

  const insertTag = db.prepare(
    `INSERT OR IGNORE INTO tags (tag, label, description, icon)
     VALUES (?, ?, NULL, NULL)`,
  );

  for (const tag of normalizedTags) {
    insertTag.run(tag, tag);
  }

  return normalizedTags;
}

export function setTagMetadata(
  db: DatabaseSync,
  tag: unknown,
  metadata: { label?: unknown; description?: unknown; icon?: unknown } = {},
): string | null {
  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag) return null;

  const cleanLabel =
    typeof metadata.label === "string"
      ? metadata.label.trim() || normalizedTag
      : normalizedTag;
  const cleanDescription =
    typeof metadata.description === "string"
      ? metadata.description.trim() || null
      : null;
  const cleanIcon =
    typeof metadata.icon === "string" ? metadata.icon.trim() || null : null;

  db.prepare(
    `INSERT INTO tags (tag, label, description, icon)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tag) DO UPDATE SET
       label = excluded.label,
       description = excluded.description,
       icon = excluded.icon`,
  ).run(normalizedTag, cleanLabel, cleanDescription, cleanIcon);

  return normalizedTag;
}

export function setTagDescription(
  db: DatabaseSync,
  tag: unknown,
  description: unknown,
): string | null {
  return setTagMetadata(db, tag, { description });
}

export function getTagMetadata(
  db: DatabaseSync,
  tags: unknown,
): Map<string, Tag> {
  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length === 0) return new Map();

  const placeholders = normalizedTags.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT tag, label, description, icon
       FROM tags
       WHERE tag IN (${placeholders})`,
    )
    .all(...normalizedTags) as Array<{
    tag: string;
    label: string | null;
    description: string | null;
    icon: string | null;
  }>;

  const metadata = new Map<string, Tag>();
  for (const row of rows) {
    metadata.set(row.tag, {
      tag: row.tag,
      label: row.label ?? row.tag,
      description: row.description,
      icon: row.icon,
    });
  }

  for (const tag of normalizedTags) {
    if (!metadata.has(tag)) {
      metadata.set(tag, { tag, label: tag, description: null, icon: null });
    }
  }

  return metadata;
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
  const normalizedTags = ensureTagMetadata(db, tags);
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
