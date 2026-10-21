import type { FeatureCollection } from "geojson";

export type ImportGroup = {
  key: string;
  label: string;
  sourceFeatures: number;
  issues: number;
};

export type ImportPreview = {
  sourceFeatures: number;
  issues: number;
  attributes: string[];
  geometries: Record<string, number>;
  groups: ImportGroup[];
};

export type CategoryMapping = {
  key: string;
  legend_id?: number;
  name?: string;
  color?: string;
};

export type AmsterdamImport = {
  geojson: FeatureCollection;
  categoryProperty: string;
  titleProperty: string;
  layers: { name: string; color: string }[];
  sources: { table: string; features: number }[];
  sourceUrl: string;
  warnings: string[];
};
