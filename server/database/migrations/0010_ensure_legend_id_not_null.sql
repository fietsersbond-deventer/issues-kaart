-- Ensure all existing issues have a non-null legend_id
-- First, set any null legend_id to 1 (assuming there's at least one legend with id 1)
UPDATE issues SET legend_id = 1 WHERE legend_id IS NULL;

-- Then add a NOT NULL constraint to the legend_id column
-- SQLite doesn't support adding NOT NULL constraints directly, so we need to recreate the table
-- Create a backup of the current table
CREATE TABLE issues_backup AS SELECT * FROM issues;

-- Drop the current table
DROP TABLE issues;

-- Recreate the table with the NOT NULL constraint
CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  legend_id INTEGER NOT NULL,
  geometry TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (legend_id) REFERENCES legend(id) ON DELETE RESTRICT
);

-- Restore data from backup
INSERT INTO issues (id, title, description, legend_id, geometry, created_at)
SELECT id, title, description, legend_id, geometry, created_at FROM issues_backup;

-- Drop the backup table
DROP TABLE issues_backup;
