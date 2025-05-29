<template>
  <ol-feature @click="onClick">
    <ol-geom-line-string :coordinates="transformedCoords">
      <ol-style :condition="true">
        <ol-style-stroke :color="color" :width="selected ? 6 : 4" />
      </ol-style>
    </ol-geom-line-string>
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
  coordinates: [number, number][]; // Array of coordinates for polyline
  color: string;
  selected?: boolean;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const showTooltip = ref(false);

// Transform coordinates to EPSG:3857
const transformedCoords = computed(() => {
  return props.coordinates.map((coord) => fromLonLat(coord));
});

// Calculate center of line for tooltip
const tooltipPosition = computed(() => {
  if (!props.coordinates.length) {
    return fromLonLat([0, 0]);
  }

  // Use middle point of the line
  const midIndex = Math.floor(props.coordinates.length / 2);
  const coord = props.coordinates[midIndex];
  return fromLonLat(coord || [0, 0]);
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
