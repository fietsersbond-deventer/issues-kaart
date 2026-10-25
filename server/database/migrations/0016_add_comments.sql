CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  author_id INTEGER,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE, -- opruimen comments als issue verwijderd is
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL -- bewaar comments deleted user
);

CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
