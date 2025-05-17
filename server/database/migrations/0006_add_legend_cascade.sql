-- Create a temporary table with the CASCADE setting
CREATE TABLE IF NOT EXISTS _issues_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    geometry TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    legend_id INTEGER REFERENCES legend(id) ON DELETE RESTRICT
);

-- Copy all data from the existing table
INSERT INTO _issues_new (id, title, description, geometry, created_at, legend_id)
SELECT id, title, description, geometry, created_at, legend_id
FROM issues;

-- Swap tables
DROP TABLE issues;
ALTER TABLE _issues_new RENAME TO issues;
