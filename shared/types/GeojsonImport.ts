export type ImportGroup = {
  key: string;
  label: string;
  sourceFeatures: number;
  issues: number;
};

export type ImportPreview = {
  lineSegments: number;
  lines: number;
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
