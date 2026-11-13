import type { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

export const password = "E2e-password-123!";
export const point = { type: "Point", coordinates: [6.1575, 52.2511] };

// Only called against the disposable DB created by the E2E launcher.
export function seedDatabase(db: DatabaseSync) {
  db.exec(`
    DELETE FROM issue_tags;
    DELETE FROM issues;
    DELETE FROM refresh_tokens;
    DELETE FROM password_reset_tokens;
    DELETE FROM text;
    DELETE FROM users;
    DELETE FROM legend;
    DELETE FROM tags;
    DELETE FROM sqlite_sequence;
  `);
  const insertUser = db.prepare("INSERT INTO users (id, username, name, role, password_hash) VALUES (?, ?, ?, ?, ?)");
  const passwordHash = bcrypt.hashSync(password, 4);
  insertUser.run(101, "admin@example.test", "E2E Admin", "admin", passwordHash);
  insertUser.run(102, "user@example.test", "E2E User", "user", passwordHash);
  insertUser.run(103, "reset@example.test", "E2E Reset", "user", passwordHash);
  db.prepare("INSERT INTO legend (id, name, color) VALUES (?, ?, ?)").run(101, "E2E Verkeer", "#ff0000");
  db.prepare("INSERT INTO legend (id, name, color) VALUES (?, ?, ?)").run(102, "E2E Parkeren", "#0000ff");
  db.exec("INSERT INTO tags (tag, label) VALUES ('e2e-veilig', 'Veilig'), ('e2e-route', 'Route')");
  const geometries = [
    point,
    { type: "LineString", coordinates: [[6.15, 52.25], [6.16, 52.26]] },
    { type: "Polygon", coordinates: [[[6.15, 52.25], [6.16, 52.25], [6.16, 52.26], [6.15, 52.25]]] },
  ];
  for (const [index, geometry] of geometries.entries()) {
    db.prepare("INSERT INTO issues (id, title, description, plain_text, legend_id, geometry) VALUES (?, ?, ?, ?, ?, ?)")
      .run(101 + index, `E2E ${geometry.type}`, "<p>Vaste testinhoud</p>", "Vaste testinhoud", index === 1 ? 102 : 101, JSON.stringify(geometry));
    db.prepare("INSERT INTO issue_tags (issue_id, tag) VALUES (?, ?)").run(101 + index, index === 2 ? "e2e-route" : "e2e-veilig");
  }
  const insertText = db.prepare("INSERT INTO text (key, text, text_type) VALUES (?, ?, ?)");
  insertText.run("navbar.header", "E2E Fietsersbond", "plain");
  insertText.run("navbar.websiteUrl", "", "url");
  insertText.run("navbar.contactUrl", "", "url");
  insertText.run("intro.content", "<h1>Welkom bij E2E</h1>", "rich");
}
