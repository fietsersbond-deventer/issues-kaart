function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export default function addTexts(db) {
  const organizationName = process.env.NUXT_PUBLIC_ORGANIZATION_NAME ?? "";
  const organizationShortName =
    process.env.NUXT_PUBLIC_ORGANIZATION_SHORT_NAME ?? "";
  const organizationWebsite =
    process.env.NUXT_PUBLIC_ORGANIZATION_WEBSITE ?? "";
  const organizationContactUrl =
    process.env.NUXT_PUBLIC_ORGANIZATION_CONTACT_URL ?? "";
  const headerText = [organizationName, organizationShortName]
    .filter(Boolean)
    .join(" ");
  const introText = `<h1>Welkom bij de ${escapeHtml(organizationName)}</h1><p>Deze kaart toont alle onderwerpen waar we ons mee bezig houden.</p><p><strong>Om te beginnen:</strong></p><ul><li>Klik op een onderwerp op de kaart om de details te bekijken</li><li>Bekijk de legenda om te zien wat de kleuren betekenen en klik om categorieën aan of uit te schakelen</li></ul>`;

  const insertText = db.prepare(
    "INSERT OR IGNORE INTO text (key, text, text_type) VALUES (?, ?, ?)",
  );

  insertText.run("intro.content", introText, "rich");
  insertText.run("navbar.header", headerText, "plain");
  insertText.run("navbar.websiteUrl", organizationWebsite, "url");
  insertText.run("navbar.contactUrl", organizationContactUrl, "url");
}