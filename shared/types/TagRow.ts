/**
 * Database row type for tag queries
 */

export interface TagRow {
  id: number;
  tag: string;
  label: string | null;
  description: string | null;
  icon: string | null;
}
