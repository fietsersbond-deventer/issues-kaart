<template>
  <div>
    <ol-overlay
      v-if="tooltipContent && !isDrawing"
      :position="tooltipPosition"
      positioning="bottom-center"
    >
      <div class="tooltip">
        <img v-if="tooltipImage" :src="tooltipImage" class="tooltip-img" />
        <span class="tooltip-title">{{ tooltipContent }}</span>
      </div>
    </ol-overlay>
  </div>
</template>

<script lang="ts" setup>
import { ref, inject, onMounted, onUnmounted } from "vue";
import type { Feature } from "ol";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type { LineString, Point, Polygon } from "ol/geom";
import type OlMap from "ol/Map";

const { isDrawing } = defineProps<{
  isDrawing: boolean;
}>();

const map: OlMap | undefined = inject("map");

const tooltipContent = ref<string | null>(null);
const tooltipImage = ref<string | null>(null);
const tooltipPosition = ref<number[]>([0, 0]);

let pointerListener: ((evt: MapBrowserEvent<PointerEvent>) => void) | null =
  null;

onMounted(() => {
  if (!map) return;
  pointerListener = (evt: MapBrowserEvent<PointerEvent>) => {
    // Don't show tooltip when drawing/editing
    if (isDrawing) {
      tooltipContent.value = null;
      tooltipImage.value = null;
      return;
    }

    const pixel = evt.pixel;
    const features = map.getFeaturesAtPixel(pixel, { hitTolerance: 3 });
    if (features && features.length > 0) {
      const feature = features[0] as Feature<Point | LineString | Polygon>;
      const properties = feature.getProperties();

      tooltipContent.value = properties.title || "Geen titel";
      tooltipImage.value = properties.imageUrl || null;

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
  background-color: white;
  padding: 0.5rem;
  border-radius: 0.375rem; /* rounded */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06); /* shadow */
  border: 1px solid #d1d5db; /* gray-300 */
  white-space: normal;
  max-width: 12em;
}

.tooltip-img {
  max-width: 100px;
  max-height: 100px;
  display: block;
  margin: 0 auto 0.5rem auto;
  text-align: center;
}

.tooltip-title {
  display: block;
  max-width: 10em;
  word-break: break-word;
  margin: 0 auto;
}
</style>
