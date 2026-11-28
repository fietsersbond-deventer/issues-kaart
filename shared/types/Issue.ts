import type { LineString, Point, Polygon } from "geojson";
import type { Legend } from "./Legend";

export type BaseIssue = {
  title: string;
  slug?: string;
  legend_id: number;
  legend: Legend;
  tags: string[];
};

/**
 * Existing issue from database
 */
export type Issue = BaseIssue & {
  id: number;
  slug: string;
  description: string;
  geometry: Point | Polygon | LineString;
  // SQLite UTC timestamps ("YYYY-MM-DD HH:MM:SS"); see parseDbTimestamp
  created_at: string;
  // last change, or created_at when the issue was never changed
  updated_at: string;
  imageUrl: string | null; // URL path to image endpoint if issue has image
};

export type NewIssue = Omit<
  Issue,
  | "id"
  | "slug"
  | "created_at"
  | "updated_at"
  | "imageUrl"
  | "geometry"
  | "legend_id"
  | "legend"
> &
  Partial<Pick<Issue, "legend_id" | "legend">> & {
    slug?: string;
    id?: never;
    imageUrl?: never;
    geometry?: Issue["geometry"] | null;
  };

export type MapIssue = Pick<
  Issue,
  | "id"
  | "slug"
  | "title"
  | "geometry"
  | "legend"
  | "legend_id"
  | "imageUrl"
  | "tags"
>;
export type ExistingIssue = Issue;

export type AdminListIssue = Pick<
  Issue,
  "id" | "slug" | "title" | "legend_id" | "legend" | "created_at"
>;

export type MapIssueFields = "id,slug,title,legend_id,geometry,imageUrl,tags";
export type AdminIssueFields = "id,slug,title,legend_id,created_at";
export type FullIssueFields =
  "id,slug,title,description,legend_id,geometry,created_at,imageUrl,tags";

export type ParseFields<T extends string> =
  T extends `${infer Field},${infer Rest}`
    ? (Field extends keyof Issue ? Field : never) | ParseFields<Rest>
    : T extends keyof Issue
      ? T
      : never;

export type IssueWithFields<T extends string> = Pick<Issue, ParseFields<T>>;

export function isExistingIssue<T extends { id?: number }>(
  issue?: T | null,
): issue is T & { id: number } {
  if (!issue) return false;
  return "id" in issue;
}

export function isNewIssue(
  issue: Issue | MapIssue | NewIssue,
): issue is NewIssue {
  return !("id" in issue);
}

/** An issue as returned by /api/issues/print */
export type PrintIssue = Pick<
  Issue,
  | "id"
  | "slug"
  | "title"
  | "legend_id"
  | "geometry"
  | "tags"
  | "imageUrl"
  | "updated_at"
> & {
  /** Start of the description as plain text */
  excerpt: string;
};
