import type { SanitizedHTML } from "~~/shared/types/SanitizedHTML";
import { sanitizeDescriptionHtml } from "~~/shared/utils/sanitizeDescriptionOptions";

/**
 * Converts a database legend row to a Legend object with SanitizedHTML description.
 * Re-sanitizes the description to ensure it's always safe, even if old data was stored
 * before sanitization rules were in place.
 */
export function toLegendType(row: {
  id: number;
  name: string;
  description: string;
  color: string;
  icon?: string | null;
  icon_data_url?: string | null;
  created_at: string;
}): {
  id: number;
  name: string;
  description: SanitizedHTML;
  color: string;
  icon?: string | null;
  icon_data_url?: string | null;
  created_at: string;
} {
  return {
    ...row,
    description: sanitizeDescriptionHtml(row.description),
  };
}

/**
 * Converts database tag row to a Tag object with SanitizedHTML description.
 * Re-sanitizes the description to ensure it's always safe, even if old data was stored
 * before sanitization rules were in place.
 */
export function toTagType(row: {
  id: number;
  tag: string;
  label: string | null;
  description: string | null;
  icon: string | null;
}): {
  id: number;
  tag: string;
  label: string | null;
  description: SanitizedHTML | null;
  icon: string | null;
} {
  return {
    ...row,
    label: row.label ?? row.tag,
    description: row.description ? sanitizeDescriptionHtml(row.description) : null,
  };
}
