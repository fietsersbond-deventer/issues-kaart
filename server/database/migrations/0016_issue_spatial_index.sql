-- Spatial bounds are maintained in SQLite, including for existing datasets.
CREATE VIRTUAL TABLE issue_bounds USING rtree(id, min_x, max_x, min_y, max_y);

INSERT INTO issue_bounds
SELECT i.id,
       MIN(CAST(json_extract(c.value, '$[0]') AS REAL)),
       MAX(CAST(json_extract(c.value, '$[0]') AS REAL)),
       MIN(CAST(json_extract(c.value, '$[1]') AS REAL)),
       MAX(CAST(json_extract(c.value, '$[1]') AS REAL))
FROM issues i, json_tree(i.geometry, '$.coordinates') c
WHERE c.type = 'array' AND json_type(c.value, '$[0]') IN ('integer', 'real')
GROUP BY i.id;

CREATE TRIGGER issue_bounds_insert AFTER INSERT ON issues BEGIN
  INSERT INTO issue_bounds
  SELECT NEW.id, MIN(CAST(json_extract(value, '$[0]') AS REAL)), MAX(CAST(json_extract(value, '$[0]') AS REAL)),
         MIN(CAST(json_extract(value, '$[1]') AS REAL)), MAX(CAST(json_extract(value, '$[1]') AS REAL))
  FROM json_tree(NEW.geometry, '$.coordinates')
  WHERE type = 'array' AND json_type(value, '$[0]') IN ('integer', 'real')
  HAVING COUNT(*) > 0;
END;
CREATE TRIGGER issue_bounds_update AFTER UPDATE OF geometry ON issues BEGIN
  DELETE FROM issue_bounds WHERE id = NEW.id;
  INSERT INTO issue_bounds
  SELECT NEW.id, MIN(CAST(json_extract(value, '$[0]') AS REAL)), MAX(CAST(json_extract(value, '$[0]') AS REAL)),
         MIN(CAST(json_extract(value, '$[1]') AS REAL)), MAX(CAST(json_extract(value, '$[1]') AS REAL))
  FROM json_tree(NEW.geometry, '$.coordinates')
  WHERE type = 'array' AND json_type(value, '$[0]') IN ('integer', 'real')
  HAVING COUNT(*) > 0;
END;
CREATE TRIGGER issue_bounds_delete AFTER DELETE ON issues BEGIN
  DELETE FROM issue_bounds WHERE id = OLD.id;
END;
