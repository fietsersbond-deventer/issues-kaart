import sanitizeHtml from "sanitize-html";

function getPlainText(html) {
  if (!html || typeof html !== "string") {
    return "";
  }
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => `${text} `,
  }).trim();
}

// Fill `plain_text` for all existing issues (mirrors server/utils/getPlainText.ts).
export default function populatePlainText(db) {
  const rows = db.prepare("SELECT id, description FROM issues").all();
  const updateStmt = db.prepare(
    "UPDATE issues SET plain_text = ? WHERE id = ?",
  );
  for (const row of rows) {
    updateStmt.run(getPlainText(row.description), row.id);
  }
}
