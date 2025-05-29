<template>
  <MapBase :base-layer="currentLayer">
    <slot />
    <MapControlLayer v-model="currentLayer" v-model:layers="availableLayers" />
  </MapBase>
</template>

<script setup lang="ts">
import type { ConfigLayer } from "~/types/LayerConfig";

const { baseLayers } = getConfig();

const availableLayers = ref(baseLayers);
const currentLayer = ref<ConfigLayer>(
  baseLayers.find(({ visible }) => !!visible) || baseLayers[0]!
);

if (!currentLayer.value) {
  throw new Error("Geen laag beschikbaar in de configuratie");
}
</script>
