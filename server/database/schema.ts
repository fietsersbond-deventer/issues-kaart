export type User = {
  id: number;
  username: string;
  name: string | null;
  role: string;
  password_hash: string;
  created_at: Date;
};

export type Issue = {
  id: number;
  title: string;
  description: string;
  color: string;
  geometry: string; // GeoJSON stored as string
  created_at: Date;
};
