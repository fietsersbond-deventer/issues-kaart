/**
 * Database row type for legend queries
 */

export interface LegendRow {
  id: number;
  name: string;
  description: string;
  color: string;
  icon?: string | null;
  icon_data_url?: string | null;
  created_at: string;
}
