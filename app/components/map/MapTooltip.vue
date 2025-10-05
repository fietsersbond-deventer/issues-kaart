<template>
  <div>
    <ol-interaction-select :condition="pointerMove" @select="onMouseOver" />

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
import { ref, inject } from "vue";
import type { Feature, Map, MapBrowserEvent } from "ol";
import type { LineString, Point, Polygon } from "ol/geom";
import type { SelectEvent } from "ol/interaction/Select";

defineProps<{
  isDrawing: boolean;
}>();

const map: Map | undefined = inject("map");

const tooltipContent = ref<string | null>(null);
const tooltipImage = ref<string | null>(null);
const tooltipPosition = ref<number[]>([0, 0]);
const selectConditions = inject("ol-selectconditions");
const pointerMove = selectConditions.pointerMove;
function onMouseOver(event: SelectEvent) {
  const hovered = event.selected;
  if (hovered && hovered.length > 0) {
    const feature = hovered[0] as Feature<Point | LineString | Polygon>;
    const properties = feature.getProperties();
    tooltipContent.value = properties.title || "Geen titel";
    // Extract data URL image and set thumbnail
    const desc = (properties.description as string) || "";
    const imgMatch = desc.match(/<img[^>]+src=["'](data:[^"']+)["']/i);
    tooltipImage.value =
      imgMatch && typeof imgMatch[1] === "string" ? imgMatch[1] : null;

    // Change map cursor to pointer
    if (map) {
      map.getTargetElement().style.cursor = "pointer";
    }

    // Use event.mapBrowserEvent to get pointer pixel
    const evt: MapBrowserEvent = event.mapBrowserEvent;
    if (evt) {
      if (map) {
        const { pixel } = evt;
        // Use pointer pixel with a small vertical offset for correct placement
        const verticalOffset = 15; // px above pointer
        const pointerPixel = [pixel[0], pixel[1] - verticalOffset];
        tooltipPosition.value = map.getCoordinateFromPixel(pointerPixel);
      }
    }
  } else {
    tooltipContent.value = null;
    tooltipImage.value = null;

    // Reset map cursor to default
    if (map) {
      map.getTargetElement().style.cursor = "";
    }
  }
}
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
