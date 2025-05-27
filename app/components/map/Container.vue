<template>
  <MapBase :base-layer="currentLayer">
    <slot />
    <!-- <ol-control v-if="baseLayers.length > 1" position="bottom-left">
      <MapControlLayer
        v-model="currentLayer"
        v-model:layers="availableLayers"
      />
    </ol-control> -->
  </MapBase>
</template>

<script setup lang="ts">
import { ref } from "vue";
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
