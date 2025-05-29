<template>
  <ol-interaction-draw v-if="isDrawing" :type="drawType" @drawend="onDrawEnd" />
  <ol-vector-layer v-if="feature">
    <ol-source-vector>
      <ol-feature>
        <component
          :is="featureComponent"
          :coordinates="feature.geometry.coordinates"
          @change="onFeatureChange"
        >
          <ol-style :condition="true">
            <ol-style-stroke
              :color="editableFeature.editable.value ? 'blue' : 'gray'"
              :width="2"
            />
            <ol-style-fill :color="fillColor" />
          </ol-style>
        </component>
      </ol-feature>
    </ol-source-vector>
  </ol-vector-layer>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { toLonLat } from "ol/proj";
import type { DrawEvent } from "ol/interaction/Draw";
import type { Feature } from "ol";
import type { Point, LineString, Polygon } from "ol/geom";
import type {
  Feature as GeoJSONFeature,
  Point as GeoJSONPoint,
  LineString as GeoJSONLineString,
  Polygon as GeoJSONPolygon,
} from "geojson";
import { POLYGON, POINT, LINE } from "~/utils/ReactiveFeature";

const eventBus = useMapEventBus().inject();
if (!eventBus) throw new Error("No eventBus provided yet");

const editableFeature = useEditableFeature().inject();

const isDrawing = ref(false);
const drawType = ref<"Point" | "LineString" | "Polygon">("Point");

const feature = computed(() => editableFeature.feature.value);

const fillColor = computed(() => {
  const opacity = editableFeature.editable.value ? 0.3 : 0.1;
  return `rgba(0, 0, 255, ${opacity})`;
});

const featureComponent = computed(() => {
  if (!feature.value?.geometry?.type) return null;

  const type = feature.value.geometry.type as
    | "Point"
    | "LineString"
    | "Polygon";
  switch (type) {
    case "Point":
      return "ol-geom-point";
    case "LineString":
      return "ol-geom-line-string";
    case "Polygon":
      return "ol-geom-polygon";
    default:
      throw new Error(`Unsupported geometry type: ${type}`);
  }
});

function startDrawing(type: string) {
  isDrawing.value = true;
  switch (type) {
    case POINT:
      drawType.value = "Point";
      break;
    case LINE:
      drawType.value = "LineString";
      break;
    case POLYGON:
      drawType.value = "Polygon";
      break;
  }
}

function createGeoJSON<
  T extends GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon
>(
  type: "Point" | "LineString" | "Polygon",
  coordinates: T["coordinates"]
): GeoJSONFeature<T> {
  return {
    type: "Feature",
    geometry: {
      type,
      coordinates,
    },
    properties: {},
  };
}

function onDrawEnd(event: DrawEvent) {
  isDrawing.value = false;
  const drawnFeature = event.feature as Feature<Point | LineString | Polygon>;
  const geometry = drawnFeature.getGeometry();
  if (!geometry) return;

  const geomType = drawType.value;

  if (geomType === "Point") {
    const point = geometry as Point;
    const coords = toLonLat(point.getCoordinates());
    editableFeature.setFeature(createGeoJSON("Point", coords), true);
  } else if (geomType === "LineString") {
    const line = geometry as LineString;
    const coords = line.getCoordinates().map((coord) => toLonLat(coord));
    editableFeature.setFeature(createGeoJSON("LineString", coords), true);
  } else if (geomType === "Polygon") {
    const poly = geometry as Polygon;
    const coords = poly.getCoordinates();
    if (coords.length && coords[0].length) {
      const transformedCoords = [coords[0].map((coord) => toLonLat(coord))];
      editableFeature.setFeature(
        createGeoJSON("Polygon", transformedCoords),
        true
      );
    }
  }
}

function onFeatureChange(event: {
  target: Feature<Point | LineString | Polygon>;
}) {
  if (!editableFeature.editable.value) return;
  const geometry = event.target.getGeometry();
  if (!geometry) return;

  const geomType = drawType.value;

  if (geomType === "Point") {
    const point = geometry as Point;
    const coords = toLonLat(point.getCoordinates());
    editableFeature.setFeature(createGeoJSON("Point", coords), true);
  } else if (geomType === "LineString") {
    const line = geometry as LineString;
    const coords = line.getCoordinates().map((coord) => toLonLat(coord));
    editableFeature.setFeature(createGeoJSON("LineString", coords), true);
  } else if (geomType === "Polygon") {
    const poly = geometry as Polygon;
    const coords = poly.getCoordinates();
    if (coords.length && coords[0].length) {
      const transformedCoords = [coords[0].map((coord) => toLonLat(coord))];
      editableFeature.setFeature(
        createGeoJSON("Polygon", transformedCoords),
        true
      );
    }
  }
}

eventBus.on("startPoint", () => startDrawing(POINT));
eventBus.on("startLine", () => startDrawing(LINE));
eventBus.on("startPolygon", () => startDrawing(POLYGON));
</script>
