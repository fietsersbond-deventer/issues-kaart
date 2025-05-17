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
  description: string | null;
  color: string;
  created_at: Date;
  usage_count: number;
  used_by_issues: Array<{ id: number; title: string }>;
};

export type Issue = {
  id: number;
  title: string;
  description: string;
  legend_id: number | null;
  geometry: string; // GeoJSON stored as string
  created_at: Date;
};
