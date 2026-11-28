/** One category value in the import wizard and the category chosen for it. */
export type ImportCategoryRow = {
  value: string;
  count: number;
  selected: boolean;
  /**
   * Existing category id, "new" for a new category, `undefined` when nothing
   * is chosen yet. Categories are never chosen automatically.
   */
  legendId?: number | "new";
  newName: string;
  newColor: string;
};
