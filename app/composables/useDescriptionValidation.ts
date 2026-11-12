/**
 * Validates HTML content for descriptions on the client side.
 * Only allows basic formatting tags: h2, h3, h4, b, i, strong, em, ol, ul, li, br, p
 * No links, images, or event handlers allowed.
 * 
 * Mirrors the server-side validation in sanitizeDescriptionHtml.ts
 */
export function validateDescriptionHTML(html: string): { valid: boolean; error?: string } {
  if (!html || typeof html !== "string") {
    return { valid: true };
  }

  const trimmed = html.trim();
  if (!trimmed) {
    return { valid: true };
  }

  // Allowed tags for descriptions
  const allowedTags = new Set([
    "h2",
    "h3",
    "h4",
    "b",
    "i",
    "strong",
    "em",
    "ol",
    "ul",
    "li",
    "br",
    "p",
    "blockquote",
    "span",
  ]);

  // Check if HTML contains any disallowed tags or attributes
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(trimmed)) !== null) {
    const tag = (match[1] ?? "").toLowerCase();

    if (!allowedTags.has(tag)) {
      return {
        valid: false,
        error: `Disallowed HTML tag: ${tag}. Only basic formatting (bold, italic, headings, lists) is allowed.`,
      };
    }

    // Check for onclick, onload, href (links), src (images), etc.
    const fullTag = match[0];
    if (/\bon\w+\s*=/i.test(fullTag)) {
      return {
        valid: false,
        error: "Event handlers are not allowed in descriptions",
      };
    }
    if (/href\s*=/i.test(fullTag)) {
      return {
        valid: false,
        error: "Links are not allowed in descriptions",
      };
    }
    if (/src\s*=/i.test(fullTag)) {
      return {
        valid: false,
        error: "Images are not allowed in descriptions",
      };
    }
  }

  return { valid: true };
}
