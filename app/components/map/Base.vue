<template>
  <LMap
    v-bind="$attrs"
    :use-global-leaflet="true"
    :options="{
      editable: true,
    }"
    @ready="mapLoaded"
  >
    <LTileLayer
      :url="url"
      layer-type="base"
      name="OpenStreetMap"
      :attribution="attribution"
    />
    <LControlZoom position="topright" />
    <LControlScale position="bottomright" />
    <template v-if="ready">
      <slot :map="mapPromise" />
    </template>
  </LMap>
</template>
<script setup lang="ts">
import { LMap } from "@vue-leaflet/vue-leaflet";

import type { LatLngBounds, Map } from "leaflet";
import { isBoundsTuples, type IBoundsTuples } from "~/types/IBounds";

const bounds = defineModel<IBoundsTuples | LatLngBounds>("bounds", {
  required: true,
});
const { url, attribution } = defineProps<{
  url: string;
  attribution: string;
}>();

const mapPromise = deferred<Map>();
const mapObject = shallowRef<Map | null>(null);

useMap().provideMap(mapPromise.promise);

const ready = ref(false);

const resizeObserver = new ResizeObserver(() => {
  if (mapObject.value) {
    mapObject.value.invalidateSize();
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

function mapLoaded(map: Map) {
  mapPromise.resolve(map);
  ready.value = true;
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

defineExpose({
  mapPromise,
  mapObject,
});
</script>
