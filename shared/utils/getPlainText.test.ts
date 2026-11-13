import { describe, it, expect } from "vitest";
import { getPlainText, getPlainTextTruncated, removeLineBreaks } from "./getPlainText";

describe("getPlainText", () => {
  it("returns empty string for null", () => {
    expect(getPlainText(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(getPlainText(undefined)).toBe("");
  });

  it("returns empty string for non-string", () => {
    expect(getPlainText(123 as unknown as string)).toBe("");
  });

  it("strips all HTML tags", () => {
    const result = getPlainText("<b>Bold</b> and <i>italic</i>");
    expect(result).toContain("Bold");
    expect(result).toContain("and");
    expect(result).toContain("italic");
  });

  it("handles complex HTML with nested tags", () => {
    const result = getPlainText(
      "<p><strong>Title</strong></p><p>Content with <em>emphasis</em></p>",
    );
    expect(result).toContain("Title");
    expect(result).toContain("Content");
    expect(result).toContain("with");
    expect(result).toContain("emphasis");
  });

  it("removes links and images", () => {
    expect(getPlainText("<a href='#'>Link</a> and <img src='test.jpg' />")).toContain(
      "Link",
    );
  });

  it("preserves word boundaries with text filter", () => {
    const result = getPlainText("<b>Text</b><i>Next</i>");
    expect(result).toContain("Text");
    expect(result).toContain("Next");
  });

  it("handles empty tags", () => {
    expect(getPlainText("<b></b>")).toBe("");
  });

  it("handles whitespace-only content", () => {
    expect(getPlainText("<p>   </p>")).toBe("");
  });
});

describe("getPlainTextTruncated", () => {
  it("returns plain text under maxLength", () => {
    expect(getPlainTextTruncated("<b>Short</b>", 50)).toBe("Short");
  });

  it("truncates and adds ellipsis when exceeding maxLength", () => {
    const result = getPlainTextTruncated(
      "<p>This is a very long text that should be truncated at the specified length</p>",
      20,
    );
    expect(result).toContain("This is a very long");
    expect(result.endsWith("...")).toBe(true);
  });

  it("uses default maxLength of 80", () => {
    const longText =
      "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>";
    const result = getPlainTextTruncated(longText);
    expect(result.endsWith("...")).toBe(true);
  });

  it("returns empty string for null input", () => {
    expect(getPlainTextTruncated(null, 50)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(getPlainTextTruncated(undefined, 50)).toBe("");
  });
});

describe("removeLineBreaks", () => {
  it("returns empty string for null", () => {
    expect(removeLineBreaks(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(removeLineBreaks(undefined)).toBe("");
  });

  it("returns empty string for non-string", () => {
    expect(removeLineBreaks(123 as unknown as string)).toBe("");
  });

  it("preserves bold formatting", () => {
    const result = removeLineBreaks("<b>Bold text</b>");
    expect(result).toContain("<b>");
    expect(result).toContain("Bold text");
    expect(result).toContain("</b>");
  });

  it("preserves italic formatting", () => {
    const result = removeLineBreaks("<i>Italic text</i>");
    expect(result).toContain("<i>");
    expect(result).toContain("Italic text");
    expect(result).toContain("</i>");
  });

  it("removes <br> tags", () => {
    const result = removeLineBreaks("Line 1<br/>Line 2");
    expect(result).not.toContain("<br");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });

  it("removes <br> tags with space", () => {
    const result = removeLineBreaks("Line 1<br />Line 2");
    expect(result).not.toContain("<br");
  });

  it("removes paragraph tags", () => {
    const result = removeLineBreaks("<p>Para 1</p><p>Para 2</p>");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("</p>");
    expect(result).toContain("Para 1");
    expect(result).toContain("Para 2");
  });

  it("preserves heading tags", () => {
    const result = removeLineBreaks("<h3>Heading</h3>");
    expect(result).toContain("<h3>");
    expect(result).toContain("Heading");
    expect(result).toContain("</h3>");
  });

  it("preserves strong tag", () => {
    const result = removeLineBreaks("<strong>Strong</strong>");
    expect(result).toContain("<strong>");
    expect(result).toContain("Strong");
    expect(result).toContain("</strong>");
  });

  it("preserves em tag", () => {
    const result = removeLineBreaks("<em>Emphasized</em>");
    expect(result).toContain("<em>");
    expect(result).toContain("Emphasized");
    expect(result).toContain("</em>");
  });

  it("handles complex mixed formatting", () => {
    const html = "<p><b>Bold</b> and <i>italic</i></p><p>Second paragraph</p>";
    const result = removeLineBreaks(html);
    expect(result).toContain("<b>");
    expect(result).toContain("Bold");
    expect(result).toContain("</b>");
    expect(result).toContain("<i>");
    expect(result).toContain("italic");
    expect(result).toContain("</i>");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("</p>");
    expect(result).toContain("Second paragraph");
  });

  it("removes list formatting but keeps content", () => {
    const html = "<ol><li>Item 1</li><li>Item 2</li></ol>";
    const result = removeLineBreaks(html);
    expect(result).toContain("Item 1");
    expect(result).toContain("Item 2");
  });

  it("preserves blockquote", () => {
    const result = removeLineBreaks("<blockquote>Quote</blockquote>");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("Quote");
    expect(result).toContain("</blockquote>");
  });

  it("removes unsupported tags", () => {
    const html = "<p>Text <span>inline</span> <a href='#'>link</a></p>";
    const result = removeLineBreaks(html);
    expect(result).toContain("Text");
    expect(result).toContain("inline");
    expect(result).not.toContain("<a");
    expect(result).not.toContain("href");
  });

  it("handles underline and strikethrough", () => {
    const u = removeLineBreaks("<u>Underlined</u>");
    expect(u).toContain("<u>");
    expect(u).toContain("Underlined");

    const s = removeLineBreaks("<s>Strikethrough</s>");
    expect(s).toContain("<s>");
    expect(s).toContain("Strikethrough");
  });

  it("trims whitespace", () => {
    const result = removeLineBreaks("   <b>Text</b>   ");
    expect(result).not.toMatch(/^\s/);
    expect(result).not.toMatch(/\s$/);
  });
});
