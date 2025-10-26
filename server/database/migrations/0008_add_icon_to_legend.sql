-- Add icon column to legend table
ALTER TABLE legend ADD COLUMN icon TEXT;

-- The icon column will store Material Design Icon names (e.g., 'mdi-bicycle', 'mdi-traffic-light')
-- If null, the legend will use the default circle with color
-- If set, the legend will display the specified icon with the color
