import type { Geometry } from "geojson";

export type Issue = {
  id: string;
  title: string;
  description: string;
  color: string;
  geometry?: Geometry;
  created_at?: Date;
};
