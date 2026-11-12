import type { LegendRow } from "~~/shared/types/LegendRow";
import { getDb } from "~~/server/utils/db";
import { toLegendType } from "~~/server/utils/typeConversions";

export default defineEventHandler(() => {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, description, color, icon, icon_data_url, created_at FROM legend ORDER BY name ASC"
    )
    .all();
  return (rows as unknown as LegendRow[]).map(toLegendType);
});
