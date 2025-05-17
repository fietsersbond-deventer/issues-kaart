<template>
  <LMarker
    :lat-lng="latLng"
    :class="['marker-layer', { 'marker-selected': selected }]"
    @click="$emit('click')"
    @ready="onReady"
  >
    <LTooltip :sticky="true">
      <slot name="tooltip" />
    </LTooltip>
    <LIcon
      :options="{ iconSize: [40, 40], iconAnchor: [20, 40] }"
      :class="['marker-icon', { 'marker-selected': selected }]"
    >
      <VIcon icon="mdi-map-marker" :size="40" :color="color" class="text-2xl" />
    </LIcon>
  </LMarker>
</template>

<script setup lang="ts">
import { LMarker } from "@vue-leaflet/vue-leaflet";
import type { Marker } from "leaflet";

const props = defineProps<{
  latLng: [number, number];
  color: string;
  selected?: boolean;
}>();

defineEmits<{
  (e: "click"): void;
}>();
let path: HTMLElement | undefined = undefined;

function setupSvgElement(marker: Marker) {
  path = marker.getElement();
  updateClass();
}

function updateClass() {
  if (!path) return;

  if (props.selected) {
    path.classList.add("line-selected");
  } else {
    path.classList.remove("line-selected");
  }
}

function onReady(line: Marker) {
  setupSvgElement(line);
}

watch(() => props.selected, updateClass);
</script>

<style>
.leaflet-marker-icon,
.marker-icon {
  background-color: transparent;
  transition: all 0.3s ease;
  border: none;
}

.marker-selected {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))
    drop-shadow(0 0 15px var(--v-theme-primary));
  transform: scale(1.15);
}

.marker-icon:hover:not(.marker-selected) {
  transform: scale(1.1);
  filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.4));
}
</style>
