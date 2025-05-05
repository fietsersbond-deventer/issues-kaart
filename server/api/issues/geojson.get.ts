import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Issue } from "../../database/schema";

export default defineEventHandler(async () => {
  const result = await hubDatabase()
    .prepare(
      `SELECT id, title, description, color, geometry, created_at 
       FROM issues 
       ORDER BY created_at DESC`
    )
    .all<Issue>();

  const issues = result.results || [];

  const features: Feature[] = issues.map((issue: Issue) => ({
    type: "Feature",
    geometry: JSON.parse(issue.geometry) as Geometry,
    properties: {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      color: issue.color,
      created_at: issue.created_at,
    },
  }));

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return featureCollection;
});
