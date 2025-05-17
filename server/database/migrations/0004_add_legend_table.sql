-- Create legend table if it doesn't exist
CREATE TABLE IF NOT EXISTS legend (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a temporary table with the new schema
CREATE TABLE IF NOT EXISTS _issues_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    geometry TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    legend_id INTEGER REFERENCES legend(id)
);

-- Only copy data if we haven't done this migration before
INSERT OR IGNORE INTO _issues_new (id, title, description, geometry, created_at)
SELECT id, title, description, geometry, created_at
FROM issues
WHERE NOT EXISTS (
    SELECT 1 FROM pragma_table_info('issues') WHERE name='legend_id'
);

-- Only perform the table swap if we actually did the migration (i.e., if legend_id didn't exist)
DROP TABLE IF EXISTS issues_old;
ALTER TABLE issues RENAME TO issues_old;
ALTER TABLE _issues_new RENAME TO issues;

-- Clean up
DROP TABLE IF EXISTS issues_old;

