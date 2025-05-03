import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Issue } from "../../database/schema";

type IssueWithUser = Issue & {
  username: string;
};

export default defineEventHandler(async () => {
  const result = await hubDatabase()
    .prepare(
      `SELECT i.id, i.user_id, i.description, i.geometry, i.created_at, u.username 
       FROM issues i 
       LEFT JOIN users u ON i.user_id = u.id 
       ORDER BY i.created_at DESC`
    )
    .all<IssueWithUser>();

  const issues = result.results || [];

  const features: Feature[] = issues.map((issue: IssueWithUser) => ({
    type: "Feature",
    geometry: JSON.parse(issue.geometry) as Geometry,
    properties: {
      id: issue.id,
      user_id: issue.user_id,
      username: issue.username,
      description: issue.description,
      created_at: issue.created_at,
    },
  }));

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return featureCollection;
});
