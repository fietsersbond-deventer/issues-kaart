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
      // Toegestaan t.b.v. de "klik om te laden"-Street View-placeholder (zie
      // transformTags.div hieronder voor de daadwerkelijke validatie). Deze
      // toevoeging is bewust additief: de bestaande iframe-ondersteuning
      // hierboven blijft ongewijzigd, zodat er in de toekomst eventueel ook
      // andere embed-types op eenzelfde manier toegevoegd kunnen worden.
      "div",
      // Headers
      "h1",
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
      // Alleen bedoeld voor de streetview-embed wrapper (div.streetview-embed);
      // de daadwerkelijke inhoud van elk attribuut wordt streng gevalideerd in
      // transformTags.div hieronder (regex per veld) - deze lijst bepaalt enkel
      // welke attribuutnamen er ÜBERHAUPT mogen blijven staan.
      div: [
        "class",
        "data-lat",
        "data-lng",
        "data-heading",
        "data-pitch",
        "data-fov",
        "data-pano-id",
        "data-embed-src",
      ],
      // General attributes that Quill might use
      "*": ["class"],
      li: ["data-list"],
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
      // Consent-gated Street View placeholder: bewaart alléén de exacte
      // numerieke/id-attributen die deze placeholder nodig heeft, zodat er via
      // een `div` niets anders "binnengesmokkeld" kan worden (bijv. een
      // kwaadaardige data-embed-src die naar een ander domein wijst).
      div: function (tagName, attribs): Tag {
        // Elke andere <div> dan onze eigen wrapper (Quill genereert er normaal
        // gesproken geen) wordt gestript tot alleen de class - onschadelijk.
        if (attribs.class !== "streetview-embed") {
          return { tagName, attribs: { class: attribs.class ?? "" } };
        }

        // Strikte, per-veld validatie (whitelist-patronen):
        // - lat/lng/heading/pitch/fov: een getal (evt. negatief, evt. decimaal).
        // - pano-id: alleen letters/cijfers/underscore/streepje, 10-40 tekens.
        // - embed-src: moet exact beginnen met de verwachte Google embed-URL en
        //   daarna alleen het karakterbereik van het `pb`-formaat bevatten -
        //   zo kan dit veld nooit misbruikt worden om naar een ander domein of
        //   naar een `javascript:`-achtige waarde te verwijzen.
        const numberPattern = /^-?\d{1,3}(\.\d+)?$/;
        const panoIdPattern = /^[\w-]{10,40}$/;
        const embedSrcPattern =
          /^https:\/\/www\.google\.(com|nl)\/maps\/embed\?pb=[\w!.,-]+$/;

        if (
          !numberPattern.test(attribs["data-lat"] ?? "") ||
          !numberPattern.test(attribs["data-lng"] ?? "") ||
          !numberPattern.test(attribs["data-heading"] ?? "") ||
          !numberPattern.test(attribs["data-pitch"] ?? "") ||
          !numberPattern.test(attribs["data-fov"] ?? "") ||
          !panoIdPattern.test(attribs["data-pano-id"] ?? "") ||
          !embedSrcPattern.test(attribs["data-embed-src"] ?? "")
        ) {
          // Eén van de velden klopt niet: degradeer naar een onschadelijke
          // <span> zonder attributen, in plaats van de placeholder half-geldig
          // door te laten.
          return { tagName: "span", attribs: {} };
        }

        return { tagName, attribs };
      },
    },
  });
}
