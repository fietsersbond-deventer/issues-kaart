import toBbox from "@turf/bbox";
import type { BBox, FeatureCollection } from "geojson";
import gebieden from "~/assets/gebieden.geojson?raw";

/**
 * The area (see assets/gebieden.geojson) that belongs to this instance.
 * localhost is treated as the Deventer instance.
 */
export function useCurrentArea() {
  const hostname = import.meta.client
    ? location.hostname === "localhost"
      ? "deventer.kaart.fietsersbond.nl"
      : location.hostname
    : "";

  const collection = JSON.parse(gebieden) as FeatureCollection;
  const feature = collection.features.find(
    (f) => new URL(f.properties?.areaUrl).hostname === hostname,
  );

  // WGS84 [west, south, east, north]
  const bbox: BBox | undefined = feature ? toBbox(feature) : undefined;

  return { hostname, bbox };
}
