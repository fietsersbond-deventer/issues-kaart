export type Comment = {
  id: number;
  issue_id: number;
  author_id: number | null;
  author_name: string | null;
  body: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
};

export type NewComment = {
  body: string;
};
