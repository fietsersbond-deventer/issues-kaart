import { describe, it, expect } from "vitest";
import { normalizeSlug, slugify } from "./slug";

describe("normalizeSlug", () => {
  it("converts to lowercase", () => {
    expect(normalizeSlug("HELLO")).toBe("hello");
  });

  it("replaces special characters", () => {
    expect(normalizeSlug("Café")).toBe("cafe");
    expect(normalizeSlug("naïve")).toBe("naive");
  });

  it("replaces ligatures", () => {
    expect(normalizeSlug("Æther")).toBe("aether");
    expect(normalizeSlug("œuvre")).toBe("oeuvre");
    expect(normalizeSlug("Ø")).toBe("o");
    expect(normalizeSlug("Łódź")).toBe("lodz");
    expect(normalizeSlug("straße")).toBe("strasse");
  });

  it("replaces spaces and special chars with hyphens", () => {
    expect(normalizeSlug("hello world")).toBe("hello-world");
    expect(normalizeSlug("hello-world")).toBe("hello-world");
    expect(normalizeSlug("hello & world")).toBe("hello-world");
  });

  it("removes leading and trailing hyphens", () => {
    expect(normalizeSlug("-hello-")).toBe("hello");
    expect(normalizeSlug("--hello--")).toBe("hello");
  });

  it("removes whitespace", () => {
    expect(normalizeSlug("  hello  ")).toBe("hello");
    expect(normalizeSlug(" L'été & Æther ")).toBe("l-ete-aether");
  });

  it("returns empty string for non-alphanumeric input", () => {
    expect(normalizeSlug("!!!")).toBe("");
    expect(normalizeSlug("   ")).toBe("");
    expect(normalizeSlug("---")).toBe("");
  });
});

describe("slugify", () => {
  it("uses normalized slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("returns 'onderwerp' for empty slug", () => {
    expect(slugify("!!!")).toBe("onderwerp");
    expect(slugify("   ")).toBe("onderwerp");
  });

  it("prefixes numeric-only slugs with 'onderwerp-'", () => {
    expect(slugify("123")).toBe("onderwerp-123");
    expect(slugify("999")).toBe("onderwerp-999");
  });

  it("does not prefix alphanumeric slugs", () => {
    expect(slugify("123abc")).toBe("123abc");
    expect(slugify("abc123")).toBe("abc123");
  });

  it("handles complex input", () => {
    expect(slugify("L'été & Æther")).toBe("l-ete-aether");
  });
});
