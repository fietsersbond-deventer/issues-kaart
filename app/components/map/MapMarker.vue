<template>
  <ol-feature @click="onClick">
    <ol-geom-point :coordinates="transformedCoords">
      <ol-style :condition="true">
        <ol-style-icon
          :src="markerUrl"
          :scale="selected ? 1.2 : 1"
          :color="color"
          :anchor="[0.5, 1]"
        />
      </ol-style>
    </ol-geom-point>
    <ol-overlay
      v-if="showTooltip"
      :position="transformedCoords"
      :offset="[0, -20]"
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
  coordinates: [number, number];
  color: string;
  selected?: boolean;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const showTooltip = ref(false);
const markerUrl =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
  </svg>
`);

const transformedCoords = computed(() => {
  return fromLonLat(props.coordinates);
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
