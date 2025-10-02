<template>
  <div>
    <ol-interaction-select :condition="pointerMove" @select="onMouseOver" />

    <ol-overlay v-if="tooltipContent && !isDrawing" :position="tooltipPosition">
      <div class="tooltip">
        {{ tooltipContent }}
      </div>
    </ol-overlay>
  </div>
</template>

<script lang="ts" setup>
import type { Feature, Map, MapBrowserEvent } from "ol";
import type { LineString, Point, Polygon } from "ol/geom";
import type { SelectEvent } from "ol/interaction/Select";

defineProps<{
  isDrawing: boolean;
}>();

const map: Map | undefined = inject("map");

const tooltipContent = ref<string | null>(null);
const tooltipPosition = ref<number[]>([0, 0]);
const selectConditions = inject("ol-selectconditions");
const pointerMove = selectConditions.pointerMove;
function onMouseOver(event: SelectEvent) {
  const hovered = event.selected;
  if (hovered && hovered.length > 0) {
    const feature = hovered[0] as Feature<Point | LineString | Polygon>;
    const properties = feature.getProperties();
    tooltipContent.value = properties.title || "Geen titel";

    // Change map cursor to pointer
    if (map) {
      map.getTargetElement().style.cursor = "pointer";
    }

    // Use event.mapBrowserEvent to get pointer pixel
    const evt: MapBrowserEvent = event.mapBrowserEvent;
    if (evt) {
      if (map) {
        const { pixel } = evt;
        // Center tooltip above pointer: offset horizontally and vertically
        const tooltipWidth = tooltipContent.value
          ? tooltipContent.value.length * 8
          : 120; // estimate, px
        const centeredPixel = [pixel[0]! - tooltipWidth / 2, pixel[1]! - 70];
        tooltipPosition.value = map.getCoordinateFromPixel(centeredPixel);
      }
    }
  } else {
    tooltipContent.value = null;

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
</style>
