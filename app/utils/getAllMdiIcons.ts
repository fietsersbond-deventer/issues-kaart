/**
 * Utility to fetch all available Material Design Icons
 * You can use this to get the complete list of MDI icons
 */

export interface MdiIcon {
  name: string;
  tags: string[];
  category: string;
  aliases: string[];
}

/**
 * Fetch all MDI icons from the official CDN metadata
 * This gives you access to 7000+ icons
 */
interface MdiIconRaw {
  name: string;
  tags?: string[];
  category?: string;
  aliases?: string[];
}

export async function getAllMdiIcons(): Promise<MdiIcon[]> {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/Templarian/MaterialDesign/master/meta.json"
    );
    const icons: MdiIconRaw[] = await response.json();

    return icons.map((icon) => ({
      name: `mdi-${icon.name}`,
      tags: icon.tags || [],
      category: icon.category || "uncategorized",
      aliases: icon.aliases || [],
    }));
  } catch (error) {
    console.error("Failed to fetch MDI icons:", error);
    return [];
  }
}

/**
 * Get all unique tags from icons for dropdown options
 */
export function getTagOptions(
  icons: MdiIcon[]
): Array<{ title: string; value: string }> {
  // Collect all tags
  const tagCounts: Record<string, number> = {};

  icons.forEach((icon) => {
    icon.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Convert to dropdown options and sort by frequency
  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a) // Sort by count descending
    .map(([tag, count]) => ({
      title: `${tag} (${count})`,
      value: tag,
    }));
}

/**
 * Get icons by tag
 */
export function getIconsByTag(icons: MdiIcon[], tag: string): MdiIcon[] {
  return icons.filter((icon) =>
    icon.tags.some((iconTag) => iconTag.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Search icons by name or tags
 */
export function searchIcons(icons: MdiIcon[], query: string): MdiIcon[] {
  const searchTerm = query.toLowerCase();
  return icons.filter(
    (icon) =>
      icon.name.toLowerCase().includes(searchTerm) ||
      icon.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
      icon.aliases.some((alias) => alias.toLowerCase().includes(searchTerm))
  );
}

/**
 * Transport and bicycle related categories in MDI
 */
export const TRANSPORT_CATEGORIES = [
  "transportation",
  "automotive",
  "bicycle",
  "sign",
  "places",
  "navigation",
];

/**
 * Get all transport-related icons
 */
export function getTransportIcons(icons: MdiIcon[]): MdiIcon[] {
  return icons.filter(
    (icon) =>
      TRANSPORT_CATEGORIES.includes(icon.category.toLowerCase()) ||
      icon.tags.some((tag) =>
        [
          "transport",
          "bicycle",
          "bike",
          "car",
          "bus",
          "train",
          "road",
          "traffic",
          "sign",
        ].includes(tag.toLowerCase())
      )
  );
}
