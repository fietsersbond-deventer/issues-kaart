export interface User {
  id: number;
  username: string;
  name: string | null;
  role: string;
  created_at: string;
  reset_token?: string;
  reset_token_expires_at?: string;
}