import type { MapIssue, NewIssue } from "~~/shared/types/Issue";
import { transform } from "ol/proj";

/**
 * Returns the properties object for any OpenLayers feature, with type safety.
 */
export function getFeatureProperties(issue: MapIssue | NewIssue) {
  const { geometry, ...props } = issue;
  return props;
}

export function toPointCoords(issue: MapIssue | NewIssue) {
  if (issue.geometry?.type !== "Point") return [0, 0];
  return transform(issue.geometry.coordinates, "EPSG:4326", "EPSG:3857");
}

export function toLineCoords(issue: MapIssue | NewIssue) {
  if (issue.geometry?.type !== "LineString") return [[0, 0]];
  return issue.geometry.coordinates.map((coord) =>
    transform(coord, "EPSG:4326", "EPSG:3857"),
  );
}

export function toPolygonCoords(issue: MapIssue | NewIssue) {
  if (issue.geometry?.type !== "Polygon") return [[[0, 0]]];
  return issue.geometry.coordinates.map((ring) =>
    ring.map((coord) => transform(coord, "EPSG:4326", "EPSG:3857")),
  );
}
