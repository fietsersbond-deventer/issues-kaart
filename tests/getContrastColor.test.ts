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

  it("should return white for mid-tones that meet 3:1 with white", () => {
    expect(getContrastColor("#1F921F")).toBe("#ffffff");
    expect(getContrastColor("#2196F3")).toBe("#ffffff");
    expect(getContrastColor("#808080")).toBe("#ffffff");
    expect(getContrastRatio("#1F921F", "#ffffff")).toBeGreaterThanOrEqual(3);
  });

  it("should return black when white contrast is below 3:1", () => {
    expect(getContrastColor("#32CD32")).toBe("#000000");
    expect(getContrastColor("#4CAF50")).toBe("#000000");
    expect(getContrastColor("#FFC107")).toBe("#000000");
    expect(getContrastRatio("#32CD32", "#ffffff")).toBeLessThan(3);
  });

  it("should handle colors with # prefix", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
    // Color library requires # prefix
    expect(() => getContrastColor("ffffff")).toThrow();
  });
});
