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
