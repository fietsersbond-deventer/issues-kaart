-- Create legend table
CREATE TABLE IF NOT EXISTS legend (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default legend items from existing colors
INSERT INTO legend (name, color, description)
SELECT DISTINCT 
    'Item ' || ROW_NUMBER() OVER (ORDER BY color) as name,
    color,
    'Migrated from existing color' as description
FROM issues
WHERE color IS NOT NULL;

-- Add legend_id to issues table
ALTER TABLE issues ADD COLUMN legend_id INTEGER REFERENCES legend(id);

-- Update issues to reference legend items
UPDATE issues 
SET legend_id = (
    SELECT id FROM legend WHERE legend.color = issues.color
);

-- Make legend_id required and drop color column
-- We'll do this in a separate migration once the application is updated
