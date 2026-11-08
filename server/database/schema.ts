export type User = {
  id: number;
  username: string;
  name: string | null;
  role: string;
  password_hash: string;
  created_at: Date;
};

export type RefreshToken = {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  created_at: Date;
};

export type Legend = {
  id: number;
  name: string;
  description: string;
  color: string;
  created_at: Date;
  usage_count: number;
  used_by_issues: Array<{ id: number; title: string }>;
  icon?: string; // Material Design Icon name (e.g., 'mdi-bicycle')
  icon_data_url?: string; // Pre-generated canvas data URL for map rendering
};

export type Issue = {
  id: number;
  slug: string;
  title: string;
  description: string;
  plain_text: string; // description with HTML/images stripped, kept in sync for search
  legend_id: number | null;
  geometry: string; // GeoJSON stored as string
  created_at: Date;
  updated_by_user_id: number | null;
  updated_at: string | null;
};

export type TextType = "plain" | "rich" | "url";

export type TextEntry = {
  key: string;
  text: string;
  text_type: TextType;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TagSchema = {
  id: number;
  tag: string;
  label: string | null;
  description: string | null;
  icon: string | null;
  created_at: Date;
};

export type IssueTagSchema = {
  issue_id: number;
  tag_id: number;
  created_at: Date;
};

export type Comment = {
  id: number;
  issue_id: number;
  author_id: number | null;
  body: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};
