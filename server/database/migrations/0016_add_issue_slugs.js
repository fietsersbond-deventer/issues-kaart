function slugify(value) {
  const transliterated = value
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .replace(/[ß]/g, "ss");

  const slug =
    transliterated
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  if (!slug) return "onderwerp";
  return /^\d+$/.test(slug) ? `onderwerp-${slug}` : slug;
}

export default function addIssueSlugs(db) {
  db.exec("ALTER TABLE issues ADD COLUMN slug TEXT");
  const rows = db.prepare("SELECT id, title FROM issues ORDER BY id").all();
  const update = db.prepare("UPDATE issues SET slug = ? WHERE id = ?");
  const usedSlugs = new Set();

  for (const row of rows) {
    const baseSlug = slugify(typeof row.title === "string" ? row.title : "");
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
    usedSlugs.add(slug);
    update.run(slug, row.id);
  }

  db.exec("CREATE UNIQUE INDEX issues_slug_unique ON issues (slug)");
}
