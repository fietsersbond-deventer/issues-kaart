import { describe, it, expect } from "vitest";
import { getContrastColor } from "../app/utils/getContrastColor";

// Helper function to calculate WCAG relative luminance
function getLuminance(hexColor: string): number {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const toLinear = (channel: number) => {
    const sRGB = channel / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// Helper function to calculate contrast ratio between two colors
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("getContrastColor", () => {
  it("should return white for dark colors", () => {
    expect(getContrastColor("#000000")).toBe("#ffffff");
    expect(getContrastColor("#1a1a1a")).toBe("#ffffff");
    expect(getContrastColor("#333333")).toBe("#ffffff");
  });

  it("should return black for light colors", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
    expect(getContrastColor("#f0f0f0")).toBe("#000000");
    expect(getContrastColor("#dddddd")).toBe("#000000");
  });

  it("should return black for #2196F3 (Material Blue) - fixes previous BT.601 error", () => {
    const result = getContrastColor("#2196F3");
    expect(result).toBe("#000000");

    // Verify contrast ratios - this is why the old function was wrong!
    const contrastWithWhite = getContrastRatio("#2196F3", "#ffffff");
    const contrastWithBlack = getContrastRatio("#2196F3", "#000000");

    // White text only gives 3.1:1 (below WCAG AA 4.5:1)
    expect(contrastWithWhite).toBeLessThan(4.5);
    // Black text gives 6.7:1 (above WCAG AA 4.5:1)
    expect(contrastWithBlack).toBeGreaterThan(4.5);
    expect(contrastWithBlack).toBeGreaterThan(contrastWithWhite);
  });

  it("should return black for #32CD32 (lime green)", () => {
    const result = getContrastColor("#32CD32");
    expect(result).toBe("#000000");

    const contrastWithWhite = getContrastRatio("#32CD32", "#ffffff");
    const contrastWithBlack = getContrastRatio("#32CD32", "#000000");

    // Black has much better contrast than white
    expect(contrastWithBlack).toBeGreaterThan(contrastWithWhite);
    expect(contrastWithBlack).toBeGreaterThan(4.5);
  });

  it("should choose the color with highest contrast ratio", () => {
    // Test various colors and verify the contrast ratio is maximized
    const testColors = [
      "#2196F3", // Material Blue
      "#FF5722", // Deep Orange
      "#4CAF50", // Green
      "#FFC107", // Amber
      "#9C27B0", // Purple
      "#00BCD4", // Cyan
    ];

    testColors.forEach((color) => {
      const result = getContrastColor(color);
      const contrastWithWhite = getContrastRatio(color, "#ffffff");
      const contrastWithBlack = getContrastRatio(color, "#000000");

      if (result === "#ffffff") {
        expect(contrastWithWhite).toBeGreaterThanOrEqual(contrastWithBlack);
      } else {
        expect(contrastWithBlack).toBeGreaterThanOrEqual(contrastWithWhite);
      }
    });
  });

  it("should handle colors with # prefix", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
    // Color library requires # prefix
    expect(() => getContrastColor("ffffff")).toThrow();
  });

  it("should use WCAG relative luminance (not BT.601)", () => {
    // Test that we're not using the old BT.601 formula
    // For #808080 (mid gray):
    // - BT.601 brightness would be ~0.5
    // - WCAG relative luminance is ~0.216 (due to gamma correction)
    const result = getContrastColor("#808080");

    // With proper WCAG, #808080 gets black text (5.3:1) over white (4.0:1)
    expect(result).toBe("#000000");

    // Verify black has better contrast
    const contrastWithBlack = getContrastRatio("#808080", "#000000");
    const contrastWithWhite = getContrastRatio("#808080", "#ffffff");
    expect(contrastWithBlack).toBeGreaterThan(contrastWithWhite);
  });
});
