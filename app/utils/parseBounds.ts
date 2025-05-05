import type { LatLngBounds } from "leaflet";
import {
  isBoundsObject,
  isBoundsTuples,
  isLeafletBounds,
  type IBoundsObject,
  type IBoundsTuples,
} from "~/types/IBounds";

export function parseBounds(
  bounds: LatLngBounds | IBoundsObject | IBoundsTuples
): IBoundsTuples {
  if (isBoundsObject(bounds)) {
    const { south, west, north, east } = bounds;
    return [
      [south, west],
      [north, east],
    ];
  } else if (isLeafletBounds(bounds)) {
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    return [
      [southWest.lat, southWest.lng],
      [northEast.lat, northEast.lng],
    ];
  } else if (isBoundsTuples(bounds)) {
    return bounds;
  }
  throw new Error("Invalid bounds", bounds);
}
