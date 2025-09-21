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

export function isExistingIssue(issue: Issue): issue is ExistingIssue {
  return "id" in issue;
}

export function isNewIssue(issue: Issue): issue is NewIssue {
  return !("id" in issue);
}
