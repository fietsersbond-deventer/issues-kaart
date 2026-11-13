import sanitizeHtmlLib from "sanitize-html";
import type { SanitizedHTML } from "../types/SanitizedHTML";

const baseOptions = {
  allowedTags: [
    // Headers
    "h2",
    "h3",
    "h4",
    // Text formatting
    "strong",
    "b",
    "em",
    "i",
    // Lists
    "ol",
    "ul",
    "li",
    // Paragraphs and line breaks
    "p",
    "br",
    // Indentation
    "blockquote",
    // Quill may use span for formatting
    "span",
  ],
  allowedAttributes: {
    // General attributes that Quill might use
    "*": ["class"] as string[],
    li: ["data-list"] as string[],
  },
  allowedSchemes: [],
  disallowedTagsMode: "discard" as const,
  selfClosing: ["br"],
};

export type SanitizeDescriptionOptions = typeof baseOptions;

/**
 * Get sanitize-html options for description HTML sanitization.
 * Can be used with custom overrides.
 */
export function sanitizeDescriptionOptions(
  overrides?: Partial<SanitizeDescriptionOptions>,
): SanitizeDescriptionOptions {
  return {
    ...baseOptions,
    ...overrides,
  } as SanitizeDescriptionOptions;
}

/**
 * Sanitizes HTML content for rich text descriptions.
 * Only allows basic formatting (headers, bold, italic, lists).
 * No links, images, or any other complex elements.
 *
 * This is used for category and tag descriptions which are displayed in tooltips.
 */
export function sanitizeDescriptionHtml(html: string): SanitizedHTML {
  if (!html || typeof html !== "string") {
    return "" as SanitizedHTML;
  }

  return sanitizeHtmlLib(html, sanitizeDescriptionOptions()) as SanitizedHTML;
}

