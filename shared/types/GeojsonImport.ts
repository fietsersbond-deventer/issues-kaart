import type { FeatureCollection, LineString, Point, Polygon } from "geojson";

/** Geometries an issue can hold; multi-geometries are split into these. */
export type ImportGeometry = Point | LineString | Polygon;

export type ImportSettings = {
  /** Title for features without a value in `titleField`. */
  title: string;
  /** Plain text for features without a description of their own. */
  description?: string;
  titleField?: string;
  /** Field whose values decide the category; omitted means one category. */
  categoryField?: string;
  /** Field taken over as (sanitized) HTML, e.g. a KML description. */
  htmlField?: string;
  /** Fields shown as heading + text in the description. */
  fields: string[];
};

export type CategoryTarget =
  { legend_id: number } | { name: string; color: string };

/**
 * Category per category value. Values without an entry are not imported.
 * Without `categoryField` all features share the value "".
 */
export type CategoryMappings = Record<string, CategoryTarget>;

export type ImportRequest = {
  geojson: FeatureCollection;
  settings: ImportSettings;
  mappings: CategoryMappings;
  /** Original file name, used in the label of the import tag. */
  fileName?: string;
};

export type ImportResult = {
  issues: number;
  legends: number;
  /** Tag that marks all issues of this import. */
  tag: string;
  /** Saved issues with at least one image. */
  issuesWithImage: number;
  /** Images saved in descriptions (an image used twice counts twice). */
  images: number;
  /** Images removed by the HTML sanitizer; should be 0. */
  removedImages: number;
};

export type ImportField = {
  name: string;
  /** First non-empty value, as text, to help recognise the field. */
  sample: string;
};

export type CategoryValue = {
  value: string;
  count: number;
};

export type ImportIssue = {
  title: string;
  description: string;
  geometry: ImportGeometry;
  categoryValue: string;
};
