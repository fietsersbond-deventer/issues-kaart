import type { Geometry } from "geojson";

export type Issue = {
  id: string;
  description: string;
  geometry: Geometry;
  created_at: Date;
};
