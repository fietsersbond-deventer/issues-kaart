import Color from "color";

// Calculate contrast color based on WCAG relative luminance
export function getContrastColor(hexColor: string): string {
  const color = Color(hexColor);

  // Calculate WCAG contrast ratios with white and black
  const contrastWithWhite = color.contrast(Color("#ffffff"));
  const contrastWithBlack = color.contrast(Color("#000000"));

  // Return the color with highest contrast
  return contrastWithWhite > contrastWithBlack ? "#ffffff" : "#000000";
}
