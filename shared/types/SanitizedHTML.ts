import type { Nominal } from "./Nominal";
import sanitizeHtml from "sanitize-html";

/**
 * Nominal type for sanitized HTML content to prevent mixing up with plain strings.
 * This ensures that any HTML content used in the application has been explicitly sanitized,
 * reducing the risk of XSS vulnerabilities.
 */
export type SanitizedHTML = Nominal<string, "SanitizedHTML">;

export const SanitizedHTML = {
  from(value: string, options?: sanitizeHtml.IOptions): SanitizedHTML {
    return sanitizeHtml(value, options) as SanitizedHTML;
  },
};
