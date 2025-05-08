<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { Map } from "leaflet";
import { WMTSLayer } from "./WMTSLayer";
import type { ConfigWMTSLayer } from "~/types/LayerConfig";

type Props = ConfigWMTSLayer & {
  zIndex?: number;
  opacity?: number;
};

const {
  url,
  layer,
  style = "default",
  tilematrixset = "EPSG:3857",
  version = "1.0.0",
  format = "image/png",
  zIndex,
  opacity,
} = defineProps<Props>();

const mapPromise = useMap().injectMap();
const mapObject = ref<Map | null>(null);
const wmtsLayer = ref<typeof WMTSLayer | null>(null);

watch(
  () => zIndex,
  (newZIndex) => {
    if (wmtsLayer.value) {
      wmtsLayer.value.setZIndex(newZIndex);
    }
  }
);

watch(
  () => opacity,
  (newOpacity) => {
    if (wmtsLayer.value) {
      wmtsLayer.value.setOpacity(newOpacity);
    }
  }
);

onMounted(async () => {
  const map = await mapPromise;
  if (!map) return;

  mapObject.value = map;
  wmtsLayer.value = new WMTSLayer(url, {
    layer,
    version,
    format,
    style,
    tilematrixset,
  });

  if (mapObject.value && wmtsLayer.value) {
    mapObject.value.addLayer(wmtsLayer.value);
  }
});

onUnmounted(() => {
  if (mapObject.value && wmtsLayer.value) {
    mapObject.value.removeLayer(wmtsLayer.value);
    wmtsLayer.value = null;
  }
});
</script>
