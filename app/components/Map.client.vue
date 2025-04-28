<template>
  <div class="h-screen w-screen">
    <LMap
      v-model:zoom="zoom"
      v-model:center="center"
      v-model:bounds="bounds"
      :use-global-leaflet="true"
      @ready="mapLoaded"
    >
      <LTileLayer :url layer-type="base" name="OpenStreetMap" :attribution />
      <LControlZoom position="topright" />
      <LControlScale position="bottomright" />
    </LMap>
  </div>
</template>

<script setup lang="ts">
import { isBoundsTuples } from "~/types/IBounds";

// voorkom fout bij het importeren van leaflet
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import L from "leaflet";
import {
  LMap,
  LTileLayer,
  LControlZoom,
  LControlScale,
} from "@vue-leaflet/vue-leaflet";
import type { Map } from "leaflet";

const bounds = ref<[[number, number], [number, number]]>([
  [52.229059859924256, 6.04574203491211],
  [52.30207457819167, 6.30941390991211],
]);

const apikey = useRuntimeConfig().public.apikey;
const url = `https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${apikey}`;
const mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
const ocmlink = '<a href="http://thunderforest.com/">Thunderforest</a>';
const attribution = `&copy; ${mapLink} contributors, &copy; contributers ${ocmlink} `;

// try {
//   const parsed = JSON.parse(useRuntimeConfig().env.bounds);
//   if (parsed) {
//     bounds.value = parsed;
//   }
// } catch (e) {
//   console.error("Invalid bounds format in runtime config:", e);
//   throw new Error("Invalid bounds format in runtime config");
// }
const center = ref<[number, number]>([
  (bounds.value[0][0] + bounds.value[1][0]) / 2,
  (bounds.value[0][1] + bounds.value[1][1]) / 2,
]);

console.log("bounds:", bounds.value);
console.log("Center:", center.value);

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
