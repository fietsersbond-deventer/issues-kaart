import { describe, it, expect } from "vitest";

// Import the sanitizeHtml function
const { sanitizeHtml } = await import("../server/utils/sanitizeHtml");

describe("HTML Sanitization Security Tests", () => {
  describe("Basic sanitization", () => {
    it("should allow basic HTML tags from Quill editor", () => {
      const input =
        "<h1>Title</h1><p>Content with <strong>bold</strong> and <em>italic</em> text</p>";
      const result = sanitizeHtml(input);
      expect(result).toBe(
        "<h1>Title</h1><p>Content with <strong>bold</strong> and <em>italic</em> text</p>"
      );
    });

    it("should allow lists", () => {
      const input =
        "<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>";
      const result = sanitizeHtml(input);
      expect(result).toBe(
        "<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>"
      );
    });

    it("should allow links with safe attributes", () => {
      const input =
        '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener"');
    });

    it("should allow images with safe attributes", () => {
      const input =
        '<img src="https://example.com/image.jpg" alt="Description" width="100" height="100">';
      const result = sanitizeHtml(input);
      expect(result).toContain('<img src="https://example.com/image.jpg"');
      expect(result).toContain('alt="Description"');
      expect(result).toContain('width="100"');
      expect(result).toContain('height="100"');
    });
  });

  describe("XSS Prevention Tests", () => {
    it("should remove script tags", () => {
      const input =
        '<p>Safe content</p><script>alert("XSS")</script><p>More content</p>';
      const result = sanitizeHtml(input);
      expect(result).toBe("<p>Safe content</p><p>More content</p>");
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    it("should remove onclick and other event handlers", () => {
      const input = "<p onclick=\"alert('XSS')\">Click me</p>";
      const result = sanitizeHtml(input);
      expect(result).toBe("<p>Click me</p>");
      expect(result).not.toContain("onclick");
    });

    it("should remove dangerous event attributes", () => {
      const input =
        '<img src="x" onerror="alert(\'XSS\')" onload="alert(\'XSS2\')">';
      const result = sanitizeHtml(input);
      expect(result).toContain('<img src="x" />');
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });

    it("should remove javascript: URLs", () => {
      const input = "<a href=\"javascript:alert('XSS')\">Click me</a>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("alert");
    });

    it("should remove data: URLs with script content", () => {
      const input =
        "<a href=\"data:text/html,<script>alert('XSS')</script>\">Click me</a>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("data:text/html");
      expect(result).not.toContain("script");
    });

    it("should remove dangerous style attributes", () => {
      const input =
        "<p style=\"background-image: url(javascript:alert('XSS'))\">Text</p>";
      const result = sanitizeHtml(input);
      // DOMPurify should clean the dangerous style
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("alert");
    });

    it("should remove object and embed tags", () => {
      const input =
        '<object data="malicious.swf"></object><embed src="malicious.swf">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("object");
      expect(result).not.toContain("embed");
    });

    it("should remove form elements", () => {
      const input =
        '<form><input type="text" name="hack"><button>Submit</button></form>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("form");
      expect(result).not.toContain("input");
      expect(result).not.toContain("button");
    });
  });

  describe("Advanced XSS Attack Vectors", () => {
    it("should handle SVG-based XSS attempts", () => {
      const input = '<svg onload="alert(\'XSS\')"><circle r="50"/></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("svg");
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });

    it("should handle CSS expression attacks", () => {
      const input = "<p style=\"width: expression(alert('XSS'))\">Text</p>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("expression");
      expect(result).not.toContain("alert");
    });

    it("should handle iframe injection", () => {
      const input = "<iframe src=\"javascript:alert('XSS')\"></iframe>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("iframe");
      expect(result).not.toContain("javascript:");
    });

    it("should handle meta tag injection", () => {
      const input =
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("meta");
      expect(result).not.toContain("javascript:");
    });

    it("should handle base tag injection", () => {
      const input = "<base href=\"javascript:alert('XSS')\">";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("base");
      expect(result).not.toContain("javascript:");
    });

    it("should handle nested script attempts", () => {
      const input = '<div><script>alert("XSS")</script></div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("script");
      expect(result).not.toContain("alert");
    });

    it("should handle HTML entity encoding bypasses", () => {
      const input =
        '<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty input", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("should handle null input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeHtml(null as any)).toBe("");
    });

    it("should handle undefined input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeHtml(undefined as any)).toBe("");
    });

    it("should handle non-string input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeHtml(123 as any)).toBe("");
    });

    it("should handle malformed HTML", () => {
      const input = "<p>Unclosed paragraph<div>Nested div</p></div>";
      const result = sanitizeHtml(input);
      // DOMPurify should fix the malformed HTML
      expect(result).toContain("Unclosed paragraph");
      expect(result).toContain("Nested div");
    });

    it("should preserve safe HTML entities", () => {
      const input =
        "<p>&lt;script&gt;alert(&quot;safe&quot;)&lt;/script&gt;</p>";
      const result = sanitizeHtml(input);
      expect(result).toContain("&lt;script&gt;");
      expect(result).toContain('alert("safe")'); // DOMPurify normalizes &quot; to "
    });
  });

  describe("Quill Editor Specific Tests", () => {
    it("should allow all Quill toolbar elements", () => {
      const input = `
        <h1>Header 1</h1>
        <h2>Header 2</h2>
        <h3>Header 3</h3>
        <h4>Header 4</h4>
        <p><strong>Bold text</strong></p>
        <p><em>Italic text</em></p>
        <p><a href="https://example.com">Link</a></p>
        <p><img src="https://example.com/image.jpg" alt="Image"></p>
        <ol><li>Ordered list item</li></ol>
        <ul><li>Unordered list item</li></ul>
        <blockquote>Indented content</blockquote>
      `;
      const result = sanitizeHtml(input);

      expect(result).toContain("<h1>Header 1</h1>");
      expect(result).toContain("<h2>Header 2</h2>");
      expect(result).toContain("<h3>Header 3</h3>");
      expect(result).toContain("<h4>Header 4</h4>");
      expect(result).toContain("<strong>Bold text</strong>");
      expect(result).toContain("<em>Italic text</em>");
      expect(result).toContain('<a href="https://example.com">Link</a>');
      expect(result).toContain(
        '<img src="https://example.com/image.jpg" alt="Image" />'
      );
      expect(result).toContain("<ol><li>Ordered list item</li></ol>");
      expect(result).toContain("<ul><li>Unordered list item</li></ul>");
      expect(result).toContain("<blockquote>Indented content</blockquote>");
    });

    it("should remove disallowed HTML elements", () => {
      const input = `
        <h5>Not allowed header</h5>
        <table><tr><td>Table content</td></tr></table>
        <video controls><source src="movie.mp4" type="video/mp4"></video>
        <audio controls><source src="audio.mp3" type="audio/mpeg"></audio>
      `;
      const result = sanitizeHtml(input);

      expect(result).not.toContain("<h5>");
      expect(result).not.toContain("<table>");
      expect(result).not.toContain("<video>");
      expect(result).not.toContain("<audio>");
    });
  });
});
