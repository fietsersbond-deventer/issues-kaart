export function normalizeSlug(value: string): string {
  const transliterated = value
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .replace(/[ß]/g, "ss");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugify(value: string): string {
  const slug = normalizeSlug(value);
  if (!slug) return "onderwerp";
  return /^\d+$/.test(slug) ? `onderwerp-${slug}` : slug;
}
