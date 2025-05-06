import type { LineString, Point, Polygon } from "geojson";

export type Issue = {
  id: string;
  title: string;
  description: string;
  color: string;
  geometry: Point | Polygon | LineString;
  created_at?: Date;
};
