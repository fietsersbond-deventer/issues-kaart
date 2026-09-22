import sanitizeHtmlLib, { type Tag } from "sanitize-html";

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
  if (!html || typeof html !== "string") {
    return "";
  }

  // Hardcoded for now — list of allowed iframe URL prefixes (must be HTTPS).
  // Update this array to permit additional embed sources.
  const allowedIframeUrls = [
    "https://www.google.com/maps/embed",
    "https://www.google.nl/maps/embed",
  ];

  return sanitizeHtmlLib(html, {
    allowedTags: [
      // Allow embedded iframes (src validated against `allowedIframeUrls` below)
      "iframe",
      // Headers
      "h2",
      "h3",
      "h4",
      // Text formatting
      "strong",
      "b",
      "em",
      "i",
      // Links and images
      "a",
      "img",
      // Lists
      "ol",
      "ul",
      "li",
      // Paragraphs and line breaks
      "p",
      "br",
      // Indentation (Quill uses blockquote for indentation)
      "blockquote",
      // Quill may also use span for certain formatting
      "span",
    ],
    allowedAttributes: {
      // Link attributes
      a: ["href", "target", "rel"],
      // Image attributes
      img: ["src", "alt", "width", "height"],
      // Restrict iframe attributes to a safe subset
      iframe: [
        "src",
        "width",
        "height",
        "frameborder",
        "style",
        "allow",
        "allowfullscreen",
        "loading",
        "referrerpolicy",
        "title",
      ],
      // General attributes that Quill might use
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
      iframe: ["http", "https"],
    },
    allowProtocolRelative: false,
    selfClosing: ["img", "br"],
    disallowedTagsMode: "discard",
    transformTags: {
      // Enforce rel="noopener noreferrer" on links with target to prevent reverse tabnabbing
      a: function (tagName, attribs) {
        if (attribs.target) {
          return {
            tagName,
            attribs: {
              ...attribs,
              rel: "noopener noreferrer",
            },
          };
        }
        return { tagName, attribs };
      },
      img: function (tagName, attribs) {
        if (
          attribs.src &&
          attribs.src.startsWith("data:") &&
          !/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(attribs.src)
        ) {
          // Remove src if not a valid image data url
          const { src, ...rest } = attribs;
          return {
            tagName: "img",
            attribs: rest,
          };
        }
        return { tagName, attribs };
      },
      iframe: function (tagName, attribs): Tag {
        if (!attribs || !attribs.src) {
          return { tagName: "span", attribs: {} };
        }

        const src = attribs.src;
        const isAllowed =
          src.startsWith("https:") &&
          allowedIframeUrls.some((prefix) => src.startsWith(prefix));

        if (!isAllowed) {
          return { tagName: "span", attribs: {} };
        }

        // Only allow a very restrictive, safe style value (no url(), expression(), etc.)
        const safeStyle =
          attribs.style && /^[a-zA-Z0-9:;.\s-]*$/.test(attribs.style)
            ? attribs.style
            : undefined;

        return {
          tagName: "iframe",
          attribs: {
            src,
            width: attribs.width || "600",
            height: attribs.height || "450",
            frameborder: attribs.frameborder || "0",
            ...(safeStyle ? { style: safeStyle } : {}),
            allow:
              attribs.allow ||
              "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
            allowfullscreen:
              attribs.allowfullscreen !== undefined
                ? attribs.allowfullscreen
                : "true",
            loading: attribs.loading || "lazy",
            referrerpolicy:
              attribs.referrerpolicy || "no-referrer-when-downgrade",
            title: attribs.title || "Embedded content",
          },
        };
      },
    },
  });
}
