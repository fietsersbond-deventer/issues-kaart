import { describe, it, expect } from "vitest";
import { toLegendType, toTagType } from "./typeConversions";

describe("toLegendType", () => {
  it("converts legend row to Legend with SanitizedHTML description", () => {
    const row = {
      id: 1,
      name: "Test Legend",
      description: "<b>Bold text</b>",
      color: "#FF0000",
      icon: "mdi-circle",
      icon_data_url: null,
      created_at: "2024-01-01T00:00:00Z",
    };

    const result = toLegendType(row);

    expect(result.id).toBe(1);
    expect(result.name).toBe("Test Legend");
    expect(result.color).toBe("#FF0000");
    expect(result.icon).toBe("mdi-circle");
    expect(result.icon_data_url).toBeNull();
    expect(result.created_at).toBe("2024-01-01T00:00:00Z");
    // Description is sanitized
    expect(result.description).toContain("<b>");
    expect(result.description).toContain("Bold text");
  });

  it("handles empty description", () => {
    const row = {
      id: 2,
      name: "No Description",
      description: "",
      color: "#00FF00",
      created_at: "2024-01-02T00:00:00Z",
    };

    const result = toLegendType(row);

    expect(result.description).toBe("");
  });

  it("sanitizes potentially unsafe HTML in description", () => {
    const row = {
      id: 3,
      name: "Unsafe HTML",
      description: '<b>Safe</b><script>alert("XSS")</script>',
      color: "#0000FF",
      created_at: "2024-01-03T00:00:00Z",
    };

    const result = toLegendType(row);

    expect(result.description).toContain("<b>Safe</b>");
    expect(result.description).not.toContain("script");
    expect(result.description).not.toContain("alert");
  });
});

describe("toTagType", () => {
  it("converts tag row to Tag with SanitizedHTML description", () => {
    const row = {
      id: 1,
      tag: "bike",
      label: "Bicycles",
      description: "<i>Two-wheeled vehicle</i>",
      icon: "mdi-bike",
    };

    const result = toTagType(row);

    expect(result.id).toBe(1);
    expect(result.tag).toBe("bike");
    expect(result.label).toBe("Bicycles");
    expect(result.icon).toBe("mdi-bike");
    expect(result.description).toContain("<i>");
    expect(result.description).toContain("Two-wheeled vehicle");
  });

  it("uses tag as fallback for null label", () => {
    const row = {
      id: 2,
      tag: "park",
      label: null,
      description: "A green space",
      icon: null,
    };

    const result = toTagType(row);

    expect(result.label).toBe("park");
  });

  it("converts null description to null", () => {
    const row = {
      id: 3,
      tag: "empty",
      label: "Empty Tag",
      description: null,
      icon: null,
    };

    const result = toTagType(row);

    expect(result.description).toBeNull();
  });

  it("sanitizes description when present", () => {
    const row = {
      id: 4,
      tag: "test",
      label: "Test",
      description: '<b>Bold</b><img src="x" onerror="alert(1)">',
      icon: null,
    };

    const result = toTagType(row);

    expect(result.description).toContain("<b>Bold</b>");
    expect(result.description).not.toContain("img");
    expect(result.description).not.toContain("onerror");
  });

  it("handles empty description string as null", () => {
    const row = {
      id: 5,
      tag: "empty",
      label: "Empty",
      description: "",
      icon: null,
    };

    const result = toTagType(row);

    // Empty string is falsy, so it becomes null
    expect(result.description).toBeNull();
  });
});
