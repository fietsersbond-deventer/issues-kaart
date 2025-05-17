import type { LineString, Point, Polygon } from "geojson";

export type Issue = {
  id: string;
  title: string;
  description: string;
  legend_id: number | null;
  legend_name?: string; // Added from join
  color?: string; // Added from join
  geometry: Point | Polygon | LineString;
  created_at?: Date;
};
