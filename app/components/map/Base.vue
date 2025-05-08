<template>
  <LMap
    v-if="layer"
    v-bind="$attrs"
    v-model:bounds="bounds"
    :use-global-leaflet="true"
    :options="{ editable: true }"
    @ready="mapLoaded"
  >
    <template v-if="ready">
      <slot :map="mapPromise" />
    </template>
    <component :is="layerComponent" v-bind="layer" />
  </LMap>
</template>
<script setup lang="ts">
import { isBoundsTuples, type IBoundsTuples } from "~/types/IBounds";
import { LMap, LTileLayer, LWmsTileLayer } from "@vue-leaflet/vue-leaflet";

import type { LatLngBounds, Map } from "leaflet";
import type { ConfigLayer } from "~/types/LayerConfig";
import LWMTSTileLayer from "./LWMTSTileLayer.vue";

const mapPromise = deferred<Map>();
const mapObject = shallowRef<Map | null>(null);
useMap().provideMap(mapPromise.promise);

const bounds = defineModel<IBoundsTuples | LatLngBounds>("bounds", {
  required: true,
});

const props = defineProps<{
  baseLayer?: ConfigLayer;
}>();

const ready = ref(false);
const config = getConfig();

const defaultBaseLayer = computed(() => {
  return config.baseLayers.find((layer: ConfigLayer) => layer.visible);
});

const layer = computed(() => {
  const layer = props.baseLayer || defaultBaseLayer.value;

  if (!layer) {
    const error = new Error("No baselayer available in the config");
    throw error;
  }

  return layer;
});

const layerComponent = computed(() => {
  const { type } = layer.value;
  if (type === "tile") {
    return LTileLayer;
  } else if (type === "wms") {
    return LWmsTileLayer;
  } else if (type === "wmts") {
    return LWMTSTileLayer;
  }
  throw new Error(`Invalid layer type ${type}`);
});

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

// const fitted = ref(false);
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
      // if (!fitted.value) {
      mapObject.value.fitBounds(bounds.value);
      // fitted.value = true;
      // }
    }
  },
  { immediate: true, deep: true }
);

defineExpose({
  mapPromise,
  mapObject,
});
</script>
