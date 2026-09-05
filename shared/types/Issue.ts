import type { LineString, Point, Polygon } from "geojson";
import type { Legend } from "./Legend";

export type BaseIssue = {
  title: string;
  legend_id: number;
  legend: Legend;
  tags: string[];
};

export type Issue = BaseIssue & {
  id: number;
  description: string;
  geometry: Point | Polygon | LineString;
  created_at: Date;
  imageUrl: string | null;
};

export type NewIssue = Omit<
  Issue,
  "id" | "created_at" | "imageUrl" | "geometry" | "legend_id" | "legend"
> &
  Partial<Pick<Issue, "geometry" | "legend_id" | "legend">>;

export type MapIssue = Pick<
  Issue,
  "id" | "title" | "geometry" | "legend" | "legend_id" | "imageUrl" | "tags"
>;
export type ExistingIssue = Issue;

export type AdminListIssue = Pick<
  Issue,
  "id" | "title" | "legend_id" | "legend" | "created_at"
>;

export type MapIssueFields = "id,title,legend_id,geometry,imageUrl,tags";
export type AdminIssueFields = "id,title,legend_id,created_at";
export type FullIssueFields =
  "id,title,description,legend_id,geometry,created_at,imageUrl,tags";

export type ParseFields<T extends string> =
  T extends `${infer Field},${infer Rest}`
    ? (Field extends keyof Issue ? Field : never) | ParseFields<Rest>
    : T extends keyof Issue
      ? T
      : never;

export type IssueWithFields<T extends string> = Pick<Issue, ParseFields<T>>;

export function isExistingIssue(
  issue?: Issue | NewIssue | null,
): issue is Issue {
  if (!issue) return false;
  return "id" in issue;
}

export function isNewIssue(issue: Issue | NewIssue): issue is NewIssue {
  return !("id" in issue);
}
