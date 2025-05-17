<template>
  <MapBase v-model:bounds="bounds" :base-layer="activeLayer">
    <slot />
    <l-control
      v-if="baseLayers.length > 1"
      position="bottomleft"
      class="d-flex align-end"
    >
      <MapControlLayer
        v-model="activeLayer"
        v-model:layers="baseLayers"
        :bounds="bounds"
      />
    </l-control>
    <LControlScale position="bottomright" />
  </MapBase>
</template>
<script setup lang="ts">
import type { ConfigLayer } from "~/types/LayerConfig";

const { bounds } = useMapBounds();
const { baseLayers } = getConfig();

const activeLayer = ref<ConfigLayer>(
  baseLayers.find(({ visible }) => !!visible) || baseLayers[0]!
);

if (!activeLayer.value) {
  throw new Error("Geen laag beschikbaar in de configuratie");
}
</script>
