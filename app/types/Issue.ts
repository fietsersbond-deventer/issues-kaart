import type { LineString, Point, Polygon } from "geojson";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type ExistingIssue = {
  id: number;
  title: string;
  description: string;
  legend_id: number | null;
  legend_name?: string; // Added from join
  color?: string; // Added from join
  geometry: Point | Polygon | LineString;
  created_at: Date;
};

export type NewIssue = Optional<
  Omit<ExistingIssue, "id" | "created_at">,
  "geometry"
>;

export type Issue = ExistingIssue | NewIssue;

/**
 * Lightweight issue type for map display
 * Contains only essential data for rendering on the map
 */
export type MapIssue = {
  id: number;
  title: string;
  color: string;
  geometry: Point | Polygon | LineString;
};

/**
 * Lightweight issue type for admin list display
 * Contains only essential data for the admin table
 */
export type AdminListIssue = {
  id: number;
  title: string;
  legend_id: number | null;
  legend_name?: string;
  created_at: Date;
};

export function isExistingIssue(issue: Issue): issue is ExistingIssue {
  return "id" in issue;
}

export function isNewIssue(issue: Issue): issue is NewIssue {
  return !("id" in issue);
}
