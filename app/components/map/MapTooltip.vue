<template>
  <div>
    <ol-overlay
      v-if="tooltipContent && !isDrawing"
      :position="tooltipPosition"
      positioning="bottom-center"
    >
      <div class="tooltip">
        <img v-if="tooltipImage" :src="tooltipImage" class="tooltip-img" />
        {{ tooltipContent }}
      </div>
    </ol-overlay>
  </div>
</template>

<script lang="ts" setup>
import { ref, inject, onMounted, onUnmounted } from "vue";
import type { Feature, Map } from "ol";
import type { MapBrowserEvent } from "ol/MapBrowserEvent";
import type { LineString, Point, Polygon } from "ol/geom";

defineProps<{
  isDrawing: boolean;
}>();

const map: Map | undefined = inject("map");

const tooltipContent = ref<string | null>(null);
const tooltipImage = ref<string | null>(null);
const tooltipPosition = ref<number[]>([0, 0]);

let pointerListener: ((evt: MapBrowserEvent<PointerEvent>) => void) | null =
  null;

onMounted(() => {
  if (!map) return;
  pointerListener = (evt: MapBrowserEvent<PointerEvent>) => {
    const pixel = evt.pixel;
    const features = map.getFeaturesAtPixel(pixel, { hitTolerance: 3 });
    if (features && features.length > 0) {
      const feature = features[0] as Feature<Point | LineString | Polygon>;
      const properties = feature.getProperties();
      tooltipContent.value = properties.title || "Geen titel";
      // Extract data URL image and set thumbnail
      const desc = (properties.description as string) || "";
      const imgMatch = desc.match(/<img[^>]+src=["'](data:[^"']+)["']/i);
      tooltipImage.value =
        imgMatch && typeof imgMatch[1] === "string" ? imgMatch[1] : null;
      map.getTargetElement().style.cursor = "pointer";
      // Always position above pointer
      if (typeof pixel[0] === "number" && typeof pixel[1] === "number") {
        const verticalOffset = 15;
        const pointerPixel = [pixel[0], pixel[1] - verticalOffset];
        tooltipPosition.value = map.getCoordinateFromPixel(pointerPixel);
      }
    } else {
      tooltipContent.value = null;
      tooltipImage.value = null;
      map.getTargetElement().style.cursor = "";
    }
  };
  map.on("pointermove", pointerListener);
});

onUnmounted(() => {
  if (map && pointerListener) {
    map.un("pointermove", pointerListener);
  }
});
</script>

<style>
.tooltip {
  cursor: pointer;
}

.tooltip {
  background-color: white;
  padding: 0.5rem;
  border-radius: 0.375rem; /* rounded */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06); /* shadow */
  border: 1px solid #d1d5db; /* gray-300 */
  white-space: nowrap;
}

.tooltip-img {
  max-width: 100px;
  max-height: 100px;
  display: block;
  margin-bottom: 0.5rem;
}
</style>
