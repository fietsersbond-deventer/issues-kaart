import sanitizeHtmlLib from "sanitize-html";

/**
 * Strips all HTML tags (including images) from a description, leaving searchable plain text.
 * Used to keep the `plain_text` column of `issues` in sync with `description`.
 */
export function getPlainText(html: string | null | undefined): string {
  if (!html || typeof html !== "string") {
    return "";
  }
  return sanitizeHtmlLib(html, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => `${text} `,
  }).trim();
}
