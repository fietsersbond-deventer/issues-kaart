import sanitizeHtmlLib from "sanitize-html";
import type { Nominal } from "./Nominal";

/**
 * Nominal type for sanitized HTML content to prevent mixing up with plain strings.
 * This ensures that any HTML content used in the application has been explicitly sanitized,
 * reducing the risk of XSS vulnerabilities.
 */
export type SanitizedHTML = Nominal<string, "SanitizedHTML">;

export const SanitizedHTML = {
  from(value: string, options?: sanitizeHtmlLib.IOptions): SanitizedHTML {
    return sanitizeHtml(value, options) as SanitizedHTML;
  },
};
