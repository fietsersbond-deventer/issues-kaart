<template>
  <div class="d-flex">
    <!-- One Layer -->
    <v-card v-if="display === 'SINGLE'" class="map-layer-control">
      <span class="map-layer-control__label">{{ activeLayer.name }}</span>
      <MapBase
        :base-layer="activeLayer"
        :bounds="bounds"
        :options="options"
        class="map-layer-control__map"
      />
    </v-card>

    <!-- Two Layer -->
    <v-card
      v-else-if="display === 'DOUBLE' && otherLayer"
      class="map-layer-control"
      @click="activeLayer = otherLayer"
    >
      <span class="map-layer-control__label">{{ otherLayer.name }}</span>
      <MapBase
        :base-layer="{ ...otherLayer, visible: true }"
        :bounds="bounds"
        :options="options"
        class="map-layer-control__map"
      />
    </v-card>

    <!-- Many Layer -->
    <template v-else>
      <v-card
        v-click-outside="{
          handler: onClickOutside,
        }"
        class="map-layer-control"
        @click="expanded = !expanded"
      >
        <span class="map-layer-control__label">{{ activeLayer.name }}</span>
        <MapBase
          :base-layer="activeLayer"
          :bounds="bounds"
          :options="options"
          class="map-layer-control__map"
        />
      </v-card>

      <v-scale-transition
        v-for="layer in expandedLayers"
        :key="layer.name"
        group
        :duration="{ enter: 500, leave: 800 }"
      >
        <v-card
          v-click-outside="{
            handler: onClickOutside,
          }"
          class="map-layer-control"
          @click="activeLayer = layer"
        >
          <span class="map-layer-control__label">{{ layer.name }}</span>
          <MapBase
            :base-layer="{ ...layer, visible: true }"
            :bounds="bounds"
            :options="options"
            class="map-layer-control__map"
          />
        </v-card>
      </v-scale-transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PointTuple } from "leaflet";
import type { ConfigLayer } from "~/types/LayerConfig";

const activeLayer = defineModel<ConfigLayer>({ required: true });
const layers = defineModel<ConfigLayer[]>("layers", { required: true });

const expanded = ref(false);

const { bounds } = defineProps<{
  bounds: [PointTuple, PointTuple];
}>();

const display = computed(() => {
  if (layers.value.length === 1) return "SINGLE";
  if (layers.value.length === 2) return "DOUBLE";
  return "MULTIPLE";
});

watch(activeLayer, () => {
  expanded.value = false;
  layers.value = layers.value.map((layer) => {
    layer.visible = layer.name === activeLayer.value.name;
    return layer;
  });
});

const otherLayer = computed(() => {
  return layers.value.find(({ visible }) => !visible);
});

const expandedLayers = computed(() => {
  return expanded.value ? layers.value.filter(({ visible }) => !visible) : [];
});

const options = {
  attributionControl: false,
  zoomControl: false,
  doubleClickZoom: false,
  dragging: false,
};

function onClickOutside() {
  expanded.value = false;
}
</script>

<style>
.map-layer-control {
  position: relative;
  z-index: 1;
  width: 80px;
  height: 80px;
  margin-right: 8px;
  border: 2px solid;
  cursor: pointer;
  overflow: hidden;
  border-radius: 8px;
  border-color: black;
}

.map-layer-control .map-layer-control__map {
  z-index: 2;
}

.map-layer-control .map-layer-control__label {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  margin: 0;
  padding: 1em 4px 0;
  text-align: center;
  color: #eee;
  text-shadow: 2px 2px #222;
  user-select: none;
}
.v-ripple__container {
  z-index: 4;
}
</style>
