import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a JSDOM window and DOMPurify instance for server-side usage
const { window } = new JSDOM('');
const purify = DOMPurify(window);

/**
 * Sanitizes HTML content based on the allowed elements from the Quill editor configuration.
 * This matches the toolbar configuration in EditForm.vue which allows:
 * - Headers (h1, h2, h3, h4)
 * - Bold and italic formatting
 * - Links and images
 * - Ordered lists, bullet lists, and check lists
 * - Indentation (using blockquote for indent)
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      // Headers
      'h1', 'h2', 'h3', 'h4',
      // Text formatting
      'strong', 'b', 'em', 'i',
      // Links and images
      'a', 'img',
      // Lists
      'ol', 'ul', 'li',
      // Paragraphs and line breaks
      'p', 'br',
      // Indentation (Quill uses blockquote for indentation)
      'blockquote',
      // Quill may also use span for certain formatting
      'span'
    ],
    ALLOWED_ATTR: [
      // Link attributes
      'href', 'target', 'rel',
      // Image attributes
      'src', 'alt', 'width', 'height',
      // General attributes that Quill might use
      'class'
    ],
    // Only allow safe protocols
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    // Remove any scripts or dangerous content
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'svg', 'math'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    // Keep relative URLs as they are
    KEEP_CONTENT: true,
    // Remove any HTML comments
    ALLOW_DATA_ATTR: false
  });
}
