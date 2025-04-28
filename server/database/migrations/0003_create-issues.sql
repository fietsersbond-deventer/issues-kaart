-- Migration number: 0003 2025-04-28T10:00:00.000Z
CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    geometry TEXT NOT NULL CHECK (json_valid(geometry)), -- Store GeoJSON as validated JSON text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
