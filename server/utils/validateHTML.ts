import sanitizeHtml from "sanitize-html";
import { sanitizeHtml as sanitizeRichHtml } from "./sanitizeHtml";
import type { TextType } from "../database/schema";

export function validateHTML(text: string, textType: TextType): string {
  if (textType === "rich") {
    return sanitizeRichHtml(text);
  }

  const plainText = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });

  if (textType === "url") {
    if (!plainText) {
      return "";
    }

    let url: URL;
    try {
      url = new URL(plainText);
    } catch {
      throw new Error("Invalid URL");
    }

    if (!["https:", "http:", "mailto:"].includes(url.protocol)) {
      throw new Error("Invalid URL protocol");
    }
  }

  return plainText;
}
