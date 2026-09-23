CREATE TABLE IF NOT EXISTS text (
    key TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    text_type TEXT NOT NULL CHECK (text_type IN ('plain', 'rich', 'url')),
    updated_by_user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);