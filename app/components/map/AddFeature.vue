<template>
  <ol-interaction-draw v-if="isDrawing" :type="drawType" @drawend="onDrawEnd" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { DrawEvent } from "ol/interaction/Draw";
import type { Feature } from "ol";
import type { Point, LineString, Polygon } from "ol/geom";
import { GeoJSON } from "ol/format";
import { POLYGON, POINT, LINE } from "~/utils/ReactiveFeature";
import type { Issue } from "~/types/Issue";

const eventBus = useMapEventBus().inject();
if (!eventBus) throw new Error("No eventBus provided yet");

const isDrawing = ref(false);
const drawType = ref<"Point" | "LineString" | "Polygon">("Point");

const { issue } = storeToRefs(useSelectedIssue());

function startDrawing(type: string) {
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
  isDrawing.value = true;
}

function onDrawEnd(event: DrawEvent) {
  isDrawing.value = false;
  const drawnFeature = event.feature as Feature<Point | LineString | Polygon>;
  const writer = new GeoJSON();
  const geoJSON = writer.writeFeatureObject(drawnFeature, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });
  if (!issue.value) {
    console.warn("No issue selected to update geometry");
    return;
  }
  issue.value.geometry = geoJSON.geometry;
}

eventBus.on("startPoint", () => startDrawing(POINT));
eventBus.on("startLine", () => startDrawing(LINE));
eventBus.on("startPolygon", () => startDrawing(POLYGON));
eventBus.on("clearFeature", () => {
  isDrawing.value = false;
  drawType.value = "Point"; // Reset to default
});

defineExpose({
  isDrawing,
});
</script>
