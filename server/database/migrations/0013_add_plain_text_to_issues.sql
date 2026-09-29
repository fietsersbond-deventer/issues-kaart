-- Add a plain_text column that mirrors `description` with HTML/images stripped,
-- so search queries can filter with SQL instead of scanning every row per keystroke.
ALTER TABLE issues ADD COLUMN plain_text TEXT NOT NULL DEFAULT '';
