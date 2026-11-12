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

/**
 * Strips HTML tags and truncates to maxLength characters with ellipsis
 */
export function getPlainTextTruncated(
  html: string | null | undefined,
  maxLength: number = 80,
): string {
  const plainText = getPlainText(html);
  return plainText.length > maxLength
    ? plainText.slice(0, maxLength) + "..."
    : plainText;
}

/**
 * Removes line-break formatting tags (<br>, <p>, </p>) while preserving inline formatting.
 * Used for compact preview display in admin tables.
 */
export function removeLineBreaks(html: string | null | undefined): string {
  if (!html || typeof html !== "string") {
    return "";
  }
  return sanitizeHtmlLib(html, {
    allowedTags: ["h2", "h3", "h4", "b", "i", "strong", "em", "u", "s", "span", "ol", "ul", "li", "blockquote"],
    allowedAttributes: {},
    textFilter: (text) => `${text} `,
  })
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?p>/gi, "")
    .trim();
}
