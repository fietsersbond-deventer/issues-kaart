import type { LineString, Point, Polygon } from "geojson";
import type { Legend } from "./Legend";

/**
 * Base issue type representing the full database structure
 */
export type BaseIssue = {
  title: string;
  legend_id: number;
  legend: Legend; // Legend data
};

/**
 * Existing issue from database
 */
export type Issue = BaseIssue & {
  id: number;
  description: string;
  geometry: Point | Polygon | LineString;
  created_at: Date;
  imageUrl: string | null; // URL path to image endpoint if issue has image
};

/**
 * New issue for creation (geometry, legend_id, and legend are optional for drafts)
 */
export type NewIssue = Omit<
  Issue,
  "id" | "created_at" | "imageUrl" | "geometry"
>;

/**
 * Lightweight issue type for map display
 * Contains only essential data for rendering on the map
 */
export type MapIssue = Pick<Issue, "id" | "title" | "geometry" | "legend">;

/**
 * Lightweight issue type for admin list display
 * Contains only essential data for the admin table
 */
export type AdminListIssue = Pick<
  Issue,
  "id" | "title" | "legend_id" | "legend" | "created_at"
>;

/**
 * Common field combinations for API requests
 */
export type MapIssueFields = "id,title,legend_id,geometry,imageUrl";
export type AdminIssueFields = "id,title,legend_id,created_at";
export type FullIssueFields =
  "id,title,description,legend_id,geometry,created_at,imageUrl";

/**
 * Helper type to parse comma-separated field strings into union of field names
 */
export type ParseFields<T extends string> =
  T extends `${infer Field},${infer Rest}`
    ? (Field extends keyof BaseIssue ? Field : never) | ParseFields<Rest>
    : T extends keyof BaseIssue
    ? T
    : never;

/**
 * Type-safe issue fields based on comma-separated string
 */
export type IssueWithFields<T extends string> = Pick<BaseIssue, ParseFields<T>>;

export function isExistingIssue(issue?: Issue | null): issue is Issue {
  if (!issue) return false;
  return "id" in issue;
}

export function isNewIssue(issue: Issue): issue is NewIssue {
  return !("id" in issue);
}
