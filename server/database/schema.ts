export type User = {
  id: number;
  username: string;
  name: string | null;
  role: string;
  password_hash: string;
  created_at: Date;
};

export type Legend = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: Date;
};

export type Issue = {
  id: number;
  title: string;
  description: string;
  color: string;  // Will be removed in future migration
  legend_id: number | null;
  geometry: string; // GeoJSON stored as string
  created_at: Date;
};
