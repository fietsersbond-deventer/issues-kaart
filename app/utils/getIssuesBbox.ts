import toBbox from "@turf/bbox";
import type { BBox, Geometry } from "geojson";
import { fromLonLat } from "ol/proj";

/** WGS84 bbox of all geometries, undefined when there are none */
export function getIssuesBbox(
  issues: { geometry?: Geometry | null; bbox?: BBox }[],
): BBox | undefined {
  let bounds: BBox | undefined;
  for (const issue of issues) {
    const bbox = issue.geometry ? toBbox(issue.geometry) : issue.bbox;
    if (!bbox) continue;
    if (!bounds) bounds = [...bbox] as BBox;
    else {
      bounds[0] = Math.min(bounds[0], bbox[0]);
      bounds[1] = Math.min(bounds[1], bbox[1]);
      bounds[2] = Math.max(bounds[2], bbox[2]);
      bounds[3] = Math.max(bounds[3], bbox[3]);
    }
  }
  return bounds;
}

/** [west, south, east, north] WGS84 -> EPSG:3857 */
export function transformBboxToOpenLayers(bbox: BBox): BBox {
  const [minX, minY, maxX, maxY] = bbox;
  const min = fromLonLat([minX, minY]);
  const max = fromLonLat([maxX, maxY]);
  return [min[0]!, min[1]!, max[0]!, max[1]!];
}
