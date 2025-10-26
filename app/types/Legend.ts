export type Legend = {
  id: number;
  name: string;
  color: string;
  description: string;
  created_at: string | Date;
  icon?: string; // Material Design Icon name (e.g., 'mdi-bicycle')
  icon_data_url?: string; // Pre-generated canvas data URL for map rendering
};
