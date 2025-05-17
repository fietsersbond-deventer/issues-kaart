import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Issue } from "../../database/schema";

export default defineEventHandler(async () => {
  const result = await hubDatabase()
    .prepare(
      `SELECT i.id, i.title, i.description, 
       l.color,
       i.legend_id, l.name as legend_name,
       i.geometry, i.created_at
       FROM issues i 
       LEFT JOIN legend l ON i.legend_id = l.id 
       ORDER BY i.created_at DESC`
    )
    .all<Issue & { legend_name?: string }>();

  const issues = result.results || [];

  const features: Feature[] = issues.map((issue: Issue) => ({
    type: "Feature",
    geometry: JSON.parse(issue.geometry) as Geometry,
    properties: {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      color: issue.color, // From legend
      created_at: issue.created_at,
    },
  }));

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return featureCollection;
});
