import toBbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import type { BBox, Geometry } from "geojson";
import { fromLonLat } from "ol/proj";

/** WGS84 bbox of all geometries, undefined when there are none */
export function getIssuesBbox(
  issues: { geometry?: Geometry | null }[],
): BBox | undefined {
  const features = issues
    .filter((issue) => issue.geometry)
    .map((issue) => ({
      type: "Feature" as const,
      properties: {},
      geometry: issue.geometry as Geometry,
    }));
  if (features.length === 0) return undefined;
  return toBbox(featureCollection(features));
}

/** [west, south, east, north] WGS84 -> EPSG:3857 */
export function transformBboxToOpenLayers(bbox: BBox): BBox {
  const [minX, minY, maxX, maxY] = bbox;
  const min = fromLonLat([minX, minY]);
  const max = fromLonLat([maxX, maxY]);
  return [min[0]!, min[1]!, max[0]!, max[1]!];
}
