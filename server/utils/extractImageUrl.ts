/**
 * Extract the first image data URL from HTML description
 * @param description HTML string that may contain an img tag with data URL
 * @returns The data URL string or null if no image found
 */
export function extractImageUrl(
  description: string | null | undefined
): string | null {
  if (!description) return null;

  const imgMatch = description.match(/<img[^>]+src=["'](data:[^"']+)["']/i);
  return imgMatch && imgMatch[1] ? imgMatch[1] : null;
}
