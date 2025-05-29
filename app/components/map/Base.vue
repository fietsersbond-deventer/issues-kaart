<template>
  <Map.OlMap
    ref="mapRef"
    :load-tiles-while-animating="true"
    :load-tiles-while-interacting="true"
  >
    <Layers.OlTileLayer>
      <Sources.OlSourceXyz
        v-if="baseLayer.type === 'xyz'"
        :url="baseLayer.url"
      />
      <Sources.OlSourceTileWms
        v-else-if="baseLayer.type === 'wms'"
        :layers="baseLayer.layers"
        :url="baseLayer.url"
        :attributions="baseLayer.attributions"
        :params="{}"
      />
      <Sources.OlSourceStadiaMaps
        v-else-if="baseLayer.type === 'stadia'"
        v-bind="baseLayer"
      />
    </Layers.OlTileLayer>
  </Map.OlMap>
</template>

<script setup lang="ts">
// https://vue3openlayers.netlify.app/get-started.html
import type { ConfigLayer } from "~/types/LayerConfig";
import { Map, Layers, Sources } from "vue3-openlayers";
import type { Map as OlMap } from "ol";

const { baseLayer } = defineProps<{
  baseLayer: ConfigLayer;
}>();

const mapRef = ref<{ map: OlMap }>();
const { view } = useMapView();
onMounted(() => {
  if (mapRef.value) {
    mapRef.value.map.setView(view);
  }
});

defineExpose({
  mapRef,
});
</script>
