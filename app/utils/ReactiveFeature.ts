import { feature as asFeature } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import type { Feature, Geometry, LineString, Point, Polygon } from "geojson";

export const POLYGON = "polygon";
export const POINT = "point";
export const LINE = "line";

export type PostProcessor = (feature: GeoJSON.Feature | null) => void;

/**
 * converts any type of data from e.g. shapefile or a Leaflet geojson into a Feature
 */
export class ReactiveFeature {
  public readonly type = ref<string | null>(null);
  public readonly feature = ref<Feature<Point | LineString | Polygon> | null>(
    null
  );

  public readonly editable = ref<boolean>(false);
  constructor(
    feature: Feature<Point | LineString | Polygon> | null = null,
    editable = false
  ) {
    this.feature.value = null;
    this.editable.value = editable;
    this.type.value = null;
    if (feature) {
      this.setFeature(feature);
    }
  }

  clearFeature() {
    this.feature.value = null;
    this.type.value = null;
    this.editable.value = false;
  }

  setFeature(feature: Feature | Geometry, editable = false) {
    this.editable.value = editable;

    if (!feature.type) {
      throw new Error("no type availabe");
    }

    if (feature.type === "Feature") {
      if (
        feature.geometry.type !== "Point" &&
        feature.geometry.type !== "Polygon" &&
        feature.geometry.type !== "LineString"
      ) {
        throw new Error("geometry type not supported");
      }
      this.feature.value = feature as Feature<Point | LineString | Polygon>;
    } else {
      // we got a geometry, make it a feature
      this.feature.value = asFeature(feature) as Feature<
        Point | LineString | Polygon
      >;
    }
  }

  get coordinates() {
    return this.feature.value?.geometry?.coordinates ?? null;
  }

  get bounds() {
    if (!this.feature.value) return null;
    const [west, south, east, north] = bbox(this.feature.value);
    return {
      south,
      west,
      north,
      east,
    };
  }
}
