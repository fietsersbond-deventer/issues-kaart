import toBbox from "@turf/bbox";
import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type {
  BBox,
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";
import gebieden from "~/assets/gebieden.geojson?raw";

type AreaFeature = Feature<Polygon | MultiPolygon>;

/**
 * The area (see assets/gebieden.geojson) that belongs to this instance.
 * An instance can have several areas (e.g. Deventer, Olst-Wijhe, Raalte);
 * these are merged into one, so only the outer boundary remains.
 * localhost is treated as the Deventer instance.
 */
export function useCurrentArea() {
  const hostname = import.meta.client
    ? location.hostname === "localhost"
      ? "deventer.kaart.fietsersbond.nl"
      : location.hostname
    : "";

  const collection = JSON.parse(gebieden) as FeatureCollection;
  const features = collection.features.filter(
    (f) => new URL(f.properties?.areaUrl).hostname === hostname,
  ) as AreaFeature[];

  const area: AreaFeature | undefined =
    features.length > 1
      ? (union(featureCollection(features)) ?? undefined)
      : features[0];

  // WGS84 [west, south, east, north]
  const bbox: BBox | undefined = area ? toBbox(area) : undefined;

  return { hostname, area, bbox };
}
