import { describe, it, expect } from "vitest";
import { extractImageUrl } from "../server/utils/extractImageUrl";

describe("extractImageUrl", () => {
  it("should extract image URL from HTML with double quotes", () => {
    const html =
      '<p>Some text</p><img src="data:image/png;base64,iVBORw0KGgo=" alt="test"><p>More text</p>';
    const result = extractImageUrl(html);
    expect(result).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("should extract image URL from HTML with single quotes", () => {
    const html =
      "<p>Some text</p><img src='data:image/jpeg;base64,/9j/4AAQ' alt='test'><p>More text</p>";
    const result = extractImageUrl(html);
    expect(result).toBe("data:image/jpeg;base64,/9j/4AAQ");
  });

  it("should extract first image if multiple images exist", () => {
    const html =
      '<img src="data:image/png;base64,first"><img src="data:image/png;base64,second">';
    const result = extractImageUrl(html);
    expect(result).toBe("data:image/png;base64,first");
  });

  it("should return null for HTML without images", () => {
    const html = "<p>Some text without images</p>";
    const result = extractImageUrl(html);
    expect(result).toBeNull();
  });

  it("should return null for HTML with non-data URL images", () => {
    const html = '<img src="https://example.com/image.jpg" alt="test">';
    const result = extractImageUrl(html);
    expect(result).toBeNull();
  });

  it("should return null for null input", () => {
    const result = extractImageUrl(null);
    expect(result).toBeNull();
  });

  it("should return null for undefined input", () => {
    const result = extractImageUrl(undefined);
    expect(result).toBeNull();
  });

  it("should return null for empty string", () => {
    const result = extractImageUrl("");
    expect(result).toBeNull();
  });

  it("should handle complex HTML with attributes before src", () => {
    const html =
      '<img class="my-class" id="img-1" src="data:image/gif;base64,R0lGOD" alt="test">';
    const result = extractImageUrl(html);
    expect(result).toBe("data:image/gif;base64,R0lGOD");
  });

  it("should be case insensitive for img tag", () => {
    const html = '<IMG SRC="data:image/png;base64,test" ALT="test">';
    const result = extractImageUrl(html);
    expect(result).toBe("data:image/png;base64,test");
  });
});
