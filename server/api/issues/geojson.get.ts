import type { Feature, FeatureCollection, Geometry } from "geojson";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async () => {
  const db = getDb();
  const issues = db
    .prepare(
      `SELECT i.id, i.title, i.description, 
     l.color, l.icon,
     i.legend_id, l.name as legend_name,
     i.geometry, i.created_at
     FROM issues i 
     LEFT JOIN legend l ON i.legend_id = l.id 
     ORDER BY i.created_at DESC`
    )
    .all();

  const features = issues
    .map((issue) => {
      const geometry =
        typeof issue.geometry === "string"
          ? (JSON.parse(issue.geometry) as Geometry)
          : undefined;
      if (!geometry) return null;
      return {
        type: "Feature",
        geometry,
        properties: {
          id: issue.id as number,
          title: issue.title as string,
          description: issue.description as string,
          color: issue.color as string,
          created_at: issue.created_at as string,
        },
      } as Feature;
    })
    .filter(Boolean) as Feature[];

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return featureCollection;
});
