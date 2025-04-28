export type User = {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
};

export type Issue = {
  id: number;
  user_id: number;
  description: string;
  geometry: string; // GeoJSON stored as string
  created_at: Date;
};
