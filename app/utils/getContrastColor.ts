import Color from "color";

const WHITE_MIN_CONTRAST = 3;

// Calculate contrast color based on WCAG relative luminance
export function getContrastColor(hexColor: string): string {
  const color = Color(hexColor);

  // Pure max-ratio picks black on mid-tones, which looks poor. Prefer white
  // as long as it meets the WCAG 3:1 minimum for large text/graphics.
  return color.contrast(Color("#ffffff")) >= WHITE_MIN_CONTRAST
    ? "#ffffff"
    : "#000000";
}
