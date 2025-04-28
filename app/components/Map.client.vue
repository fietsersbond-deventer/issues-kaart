<template>
  <div class="h-screen w-screen">
    <LMap :zoom="zoom" :center="center" :bounds="bounds" @ready="mapLoaded">
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      />
      <LControlZoom position="topright" />
      <LControlScale position="bottomright" />
    </LMap>
  </div>
</template>

<script setup lang="ts">
import { isBoundsTuples } from "~/types/IBounds";
import {
  LMap,
  LTileLayer,
  LControlZoom,
  LControlScale,
} from "@vue-leaflet/vue-leaflet";
import type { Map } from "leaflet";

const bounds = ref<[[number, number], [number, number]]>([
  [50.75, 3.2],
  [53.7, 7.22],
]);
// try {
//   const parsed = JSON.parse(useRuntimeConfig().env.bounds);
//   if (parsed) {
//     bounds.value = parsed;
//   }
// } catch (e) {
//   console.error("Invalid bounds format in runtime config:", e);
//   throw new Error("Invalid bounds format in runtime config");
// }
const center: [number, number] = [
  (bounds.value[0][0] + bounds.value[1][0]) / 2,
  (bounds.value[0][1] + bounds.value[1][1]) / 2,
];

console.log("bounds:", bounds.value);
console.log("Center:", center);

const zoom = ref(8);

onMounted(() => {
  // Add any initialization logic here
});

const mapObject = ref<Map | null>(null);

const resizeObserver = new ResizeObserver(() => {
  if (mapObject.value) {
    mapObject.value.invalidateSize();
  }
});
function mapLoaded(map: Map) {
  console.log("Map loaded");
  mapObject.value = map;
  resizeObserver.observe(map.getContainer());
}

const fitted = ref(false);
watch(
  [bounds, mapObject],
  () => {
    if (mapObject.value && bounds.value) {
      const [[south, west], [north, east]] = parseBounds(bounds.value);
      if (!isBoundsTuples(bounds.value)) {
        bounds.value = [
          [south, west],
          [north, east],
        ];
      }
      if (!fitted.value) {
        mapObject.value.fitBounds(bounds.value);
        fitted.value = true;
      }
    }
  },
  { immediate: true, deep: true }
);
</script>
