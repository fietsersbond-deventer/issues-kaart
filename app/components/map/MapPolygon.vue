<template>
  <ol-feature @click="onClick">
    <ol-geom-polygon :coordinates="transformedCoords">
      <ol-style :condition="true">
        <ol-style-stroke :color="color" :width="2" />
        <ol-style-fill :color="fillColor" />
      </ol-style>
    </ol-geom-polygon>
    <ol-overlay
      v-if="showTooltip"
      :position="tooltipPosition"
      :offset="[0, -10]"
    >
      <div class="tooltip">
        <slot name="tooltip" />
      </div>
    </ol-overlay>
  </ol-feature>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { fromLonLat } from "ol/proj";

const props = defineProps<{
  coordinates: [number, number][][]; // Array of arrays of coordinates for polygon
  color: string;
  selected?: boolean;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const showTooltip = ref(false);

// Transform coordinates to EPSG:3857
const transformedCoords = computed(() => {
  return [
    props.coordinates.map((ring) => ring.map((coord) => fromLonLat(coord))),
  ];
});

// Calculate center of polygon for tooltip
const tooltipPosition = computed(() => {
  if (!props.coordinates.length || !props.coordinates[0].length) {
    return fromLonLat([0, 0]);
  }

  const coords = props.coordinates[0]; // Use first ring
  const sumX = coords.reduce((sum, coord) => sum + coord[0], 0);
  const sumY = coords.reduce((sum, coord) => sum + coord[1], 0);
  const center: [number, number] = [sumX / coords.length, sumY / coords.length];
  return fromLonLat(center);
});

// Create semi-transparent fill color
const fillColor = computed(() => {
  // Add alpha channel to color
  const alpha = props.selected ? "80" : "40"; // 50% or 25% opacity
  return props.color + alpha;
});

function onClick() {
  emit("click");
}
</script>

<style scoped>
.tooltip {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  max-width: 200px;
  z-index: 1;
  pointer-events: none;
}
</style>
