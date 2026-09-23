import { describe, expect, it } from "vitest";

const { validateHTML } = await import("../server/utils/validateHTML");

describe("validateHTML", () => {
  it("keeps allowed markup for rich text", () => {
    expect(
      validateHTML("<p>Een <strong>belangrijke</strong> tekst.</p>", "rich"),
    ).toBe("<p>Een <strong>belangrijke</strong> tekst.</p>");
  });

  it("keeps an H1 for the intro title", () => {
    expect(validateHTML("<h1>Welkom</h1>", "rich")).toBe(
      "<h1>Welkom</h1>",
    );
  });

  it("keeps Quill list metadata for rich text", () => {
    expect(
      validateHTML(
        '<ol><li data-list="bullet">Eerste item</li></ol>',
        "rich",
      ),
    ).toBe('<ol><li data-list="bullet">Eerste item</li></ol>');
  });

  it("removes unsafe markup from rich text", () => {
    expect(validateHTML("<p>Tekst</p><script>alert('xss')</script>", "rich")).toBe(
      "<p>Tekst</p>",
    );
  });

  it("removes all HTML from plain text", () => {
    expect(
      validateHTML("<strong>Kop</strong><em>tekst</em><script>alert('xss')</script>", "plain"),
    ).toBe("Koptekst");
  });

  it("allows website and mailto URLs", () => {
    expect(validateHTML("https://example.com", "url")).toBe(
      "https://example.com",
    );
    expect(validateHTML("mailto:contact@example.com", "url")).toBe(
      "mailto:contact@example.com",
    );
  });

  it("rejects unsafe URLs", () => {
    expect(() => validateHTML("javascript:alert('xss')", "url")).toThrow(
      "Invalid URL protocol",
    );
  });
});