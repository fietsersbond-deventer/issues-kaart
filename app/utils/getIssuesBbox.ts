import { isExistingIssue, type Issue } from "~/types/Issue";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import type { BBox } from "geojson";
import { fromLonLat } from "ol/proj";

// Minimum bounding box to prevent excessive zoom-in
const MIN_BBOX: BBox = [
  6.1109776821179045, 52.23674680068737, 6.224405294943567, 52.29330327072566,
];

export function transformBboxToOpenLayers(bbox: BBox): BBox {
  const [minX, minY, maxX, maxY] = bbox;
  // Convert to OpenLayers coordinates
  const min = fromLonLat([minX, minY]);
  const max = fromLonLat([maxX, maxY]);
  return [min[0]!, min[1]!, max[0]!, max[1]!];
}

/**
 * Extends the minimum bounding box to include the issues bounding box
 * @param issuesBbox - The bounding box of the issues
 * @param minBbox - The minimum bounding box [west, south, east, north]
 * @returns The extended bounding box that includes both areas
 */
function extendMinimumBbox(issuesBbox: BBox, minBbox: BBox): BBox {
  const [issuesWest, issuesSouth, issuesEast, issuesNorth] = issuesBbox;
  const [minWest, minSouth, minEast, minNorth] = minBbox;

  // Take the minimum west/south and maximum east/north to include both areas
  return [
    Math.min(issuesWest, minWest), // westmost point
    Math.min(issuesSouth, minSouth), // southmost point
    Math.max(issuesEast, minEast), // eastmost point
    Math.max(issuesNorth, minNorth), // northmost point
  ];
}

export function getIssuesBbox(issues: Issue[]): BBox | undefined {
  const existingIssues = issues.filter((issue) => isExistingIssue(issue));
  if (existingIssues.length === 0) return undefined;

  // Create a feature collection from the geometries
  const features = existingIssues.map((issue) => ({
    type: "Feature" as const,
    properties: {},
    geometry: issue.geometry!,
  }));
  const collection = featureCollection(features);
  const issuesBbox = bbox(collection);

  // Extend the minimum bbox to include all issues
  const expandedBbox = extendMinimumBbox(issuesBbox, MIN_BBOX);

  return transformBboxToOpenLayers(expandedBbox);
}
