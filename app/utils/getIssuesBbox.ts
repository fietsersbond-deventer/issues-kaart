import { isExistingIssue, type Issue } from "~/types/Issue";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import type { BBox } from "geojson";
import { fromLonLat } from "ol/proj";

export function transformBboxToOpenLayers(bbox: BBox): BBox {
  const [minX, minY, maxX, maxY] = bbox;
  // Convert to OpenLayers coordinates
  const min = fromLonLat([minX, minY]);
  const max = fromLonLat([maxX, maxY]);
  return [min[0]!, min[1]!, max[0]!, max[1]!];
}

export function getIssuesBbox(issues: Issue[]): BBox | undefined {
  const existingIssues = issues.filter((issue) => isExistingIssue(issue));

  // If no issues exist, return the configured location bounds
  if (existingIssues.length === 0) {
    const { bounds } = useMapView();
    const bbox: BBox = [bounds.west, bounds.south, bounds.east, bounds.north];
    return transformBboxToOpenLayers(bbox);
  }

  // Create a feature collection from the geometries
  const features = existingIssues.map((issue) => ({
    type: "Feature" as const,
    properties: {},
    geometry: issue.geometry!,
  }));
  const collection = featureCollection(features);
  const issuesBbox = bbox(collection);

  return transformBboxToOpenLayers(issuesBbox);
}
