<template>
  <MapBase :base-layer="activeLayer" :bounds="bounds">
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
import type { IBoundsTuples } from "~/types/IBounds";
import type { ConfigLayer } from "~/types/LayerConfig";

const bounds = defineModel<IBoundsTuples>("bounds", {
  required: true,
});

const { baseLayers } = getConfig();

const activeLayer = ref<ConfigLayer>(
  baseLayers.find(({ visible }) => !!visible) || baseLayers[0]!
);

if (!activeLayer.value) {
  throw new Error("Geen laag beschikbaar in de configuratie");
}
</script>
