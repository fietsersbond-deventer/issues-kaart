import type { Issue } from "~/types/Issue";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import type { BBox } from "geojson";
import { fromLonLat } from "ol/proj";

function transformBboxToOpenLayers(bbox: BBox): BBox {
  const [minX, minY, maxX, maxY] = bbox;
  // Convert to OpenLayers coordinates
  const min = fromLonLat([minX, minY]);
  const max = fromLonLat([maxX, maxY]);
  return [min[0]!, min[1], max[0], max[1]];
}

export function getIssuesBbox(issues: Issue[]): BBox | undefined {
  if (issues.length === 0) return undefined;

  // Create a feature collection from the geometries
  const features = issues.map((issue) => ({
    type: "Feature" as const,
    properties: {},
    geometry: issue.geometry,
  }));
  const collection = featureCollection(features);
  return transformBboxToOpenLayers(bbox(collection));
}
