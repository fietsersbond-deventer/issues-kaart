import type { Legend } from "~~/shared/types/Legend";

export type IssueSearchItem = {
  id: number;
  slug: string;
  title: string;
  legend_id: number;
  created_at: string;
  imageUrl: string | null;
  snippets: string[];
  legend?: Legend;
  tags: string[];
};
