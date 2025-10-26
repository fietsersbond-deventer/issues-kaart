import type { LineString, Point, Polygon } from "geojson";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Base issue type representing the full database structure
 */
export type BaseIssue = {
  id: number;
  title: string;
  description: string;
  legend_id: number | null;
  geometry: Point | Polygon | LineString;
  created_at: Date;
  imageUrl: string | null; // URL path to image endpoint if issue has image
};

/**
 * Existing issue from database
 */
export type ExistingIssue = BaseIssue;

/**
 * New issue for creation (geometry is optional for drafts)
 */
export type NewIssue = Optional<
  Omit<BaseIssue, "id" | "created_at" | "imageUrl">,
  "geometry"
>;

/**
 * Union type for all issues
 */
export type Issue = ExistingIssue | NewIssue;

/**
 * Lightweight issue type for map display
 * Contains only essential data for rendering on the map
 */
export type MapIssue = Pick<BaseIssue, "id" | "title" | "geometry"> & {
  color?: string; // Mapped from legend client-side
  icon?: string; // Mapped from legend client-side
  icon_data_url?: string; // Mapped from legend client-side
};

/**
 * Lightweight issue type for admin list display
 * Contains only essential data for the admin table
 */
export type AdminListIssue = Pick<
  BaseIssue,
  "id" | "title" | "legend_id" | "created_at"
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

export function isExistingIssue(issue?: Issue | null): issue is ExistingIssue {
  if (!issue) return false;
  return "id" in issue;
}

export function isNewIssue(issue: Issue): issue is NewIssue {
  return !("id" in issue);
}
