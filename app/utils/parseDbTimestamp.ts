/**
 * SQLite stores CURRENT_TIMESTAMP as UTC text without a zone
 * ("YYYY-MM-DD HH:MM:SS"). Returns null for missing or invalid values.
 */
export function parseDbTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const timestamp = new Date(`${value.replace(" ", "T")}${hasZone ? "" : "Z"}`);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}
