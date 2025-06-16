import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitizes HTML content based on the allowed elements from the Quill editor configuration.
 * This matches the toolbar configuration in EditForm.vue which allows:
 * - Headers (h1, h2, h3, h4)
 * - Bold and italic formatting
 * - Links and images
 * - Ordered lists, bullet lists, and check lists
 * - Indentation (using blockquote for indent)
 * 
 * Uses sanitize-html which is a well-established library for HTML sanitization.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return sanitizeHtmlLib(html, {
    allowedTags: [
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
    allowedAttributes: {
      // Link attributes
      'a': ['href', 'target', 'rel'],
      // Image attributes
      'img': ['src', 'alt', 'width', 'height'],
      // General attributes that Quill might use
      '*': ['class']
    },
    // Only allow safe protocols for URLs
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // Don't allow self-closing tags to be unclosed (HTML format, not XHTML)
    selfClosing: ['img', 'br'],
    // Tags to totally discard, removing them and their content
    disallowedTagsMode: 'discard'
  });
}
