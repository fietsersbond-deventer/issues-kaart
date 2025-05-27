<template>
  <Map.OlMap
    :load-tiles-while-animating="true"
    :load-tiles-while-interacting="true"
  >
    <Map.OlView
      ref="viewRef"
      :center="center"
      :zoom="zoom"
      :projection="projection"
    />

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
import { ref, computed } from "vue";
import { fromLonLat, transform } from "ol/proj";
import type BaseEvent from "ol/events/Event";
import type { ConfigLayer } from "~/types/LayerConfig";
import type { Map as MapType, View } from "ol";
import { Map, Layers, Sources } from "vue3-openlayers";
import type { ObjectEvent } from "ol/Object";

const { baseLayer } = defineProps<{
  baseLayer: ConfigLayer;
}>();

const { center, zoom, projection, viewRef } = useMapState();

const mapRef = ref<MapType>();

function onCenterChange(event: BaseEvent) {
  // Handle center changes
  const view = event.target as View;
  center.value = view.getCenter()!;
  const newCenter = transform(view.getCenter()!, projection.value, "EPSG:4326");
  center.value = newCenter;
}

function resolutionChanged(event: ObjectEvent) {
  // currentResolution.value = event.target.getResolution();
  zoom.value = event.target.getZoom();
}

defineExpose({
  mapRef,
  viewRef,
});
</script>

<style>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
