import type { Legend } from "~~/shared/types/Legend";

export type IssueSnippet = {
  text: string;
  source: "description" | "comment";
};

export type IssueSearchItem = {
  id: number;
  slug: string;
  title: string;
  legend_id: number;
  created_at: string;
  imageUrl: string | null;
  snippets: IssueSnippet[];
  legend?: Legend;
  tags: string[];
  comment_count?: number;
};

/** Lichtgewicht zoekresultaat voor de Gazetteer-dropdown, inclusief locatie om op de kaart te tonen. */
export type IssueSearchResult = {
  id: number;
  slug: string;
  title: string;
  lat: number;
  lon: number;
  boundingbox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  geometry: GeoJSON.Geometry;
};
