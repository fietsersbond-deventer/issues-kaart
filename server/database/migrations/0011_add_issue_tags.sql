CREATE TABLE IF NOT EXISTS issue_tags (
  issue_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issue_id, tag),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issue_tags_tag ON issue_tags(tag);
CREATE INDEX IF NOT EXISTS idx_issue_tags_issue_id ON issue_tags(issue_id);