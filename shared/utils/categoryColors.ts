/** The colors a category can have, in the order they are offered. */
export const CATEGORY_COLORS = [
  "#FFD503",
  "#F9C80E",
  "#E9C46A",
  "#A7C957",
  "#6A994E",
  "#1F921F",
  "#386641",
  "#2D6A4F",
  "#40916C",
  "#52B788",
  "#2A9D8F",
  "#4D908E",
  "#0177A9",
  "#0077B6",
  "#0096C7",
  "#48CAE4",
  "#5DADE2",
  "#264653",
  "#FF7F27",
  "#F8961E",
  "#F4A261",
  "#E76F51",
  "#D84315",
  "#E31E1E",
  "#C1121F",
  "#B23A48",
  "#D45087",
  "#A23B72",
  "#9D4EDD",
  "#6C757D",
] as const;

/** Color of a new category in the category dialog. */
export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0];

/**
 * The allowed color for a value such as "#ffd503" or "#FFD503FF" (the color
 * picker may add an alpha channel), or `null` when it is not allowed.
 */
export function toCategoryColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.trim().toUpperCase();
  const rgb =
    /^#[0-9A-F]{8}$/.test(color) && color.endsWith("FF")
      ? color.slice(0, 7)
      : color;
  return CATEGORY_COLORS.find((allowed) => allowed === rgb) ?? null;
}

/**
 * A default color for the n-th new category. Steps through the palette so
 * neighbouring categories get clearly different colors.
 */
export function defaultCategoryColor(index: number): string {
  return CATEGORY_COLORS[(index * 7) % CATEGORY_COLORS.length]!;
}
