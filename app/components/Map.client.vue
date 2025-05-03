<template>
  <MapBase
    v-model:zoom="zoom"
    v-model:center="center"
    v-model:bounds="bounds"
    :url
    :attribution
    @map-loaded="mapLoaded"
  >
    <MapEditableFeatureLayer />
    <!-- Drawing toolbar -->
    <div
      class="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2 flex gap-2"
    >
      <Toolbar />
    </div>
  </MapBase>
</template>

<script setup lang="ts">
import type { Map, FeatureGroup } from "leaflet";
import type { Geometry } from "geojson";

const bounds = ref<[[number, number], [number, number]]>([
  [52.229059859924256, 6.04574203491211],
  [52.30207457819167, 6.30941390991211],
]);

const apikey = useRuntimeConfig().public.apikey;
const url = `https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${apikey}`;
const mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
const ocmlink = '<a href="http://thunderforest.com/">Thunderforest</a>';
const attribution = `&copy; ${mapLink} contributors, &copy; contributers ${ocmlink}`;

const center = ref<[number, number]>([
  (bounds.value[0][0] + bounds.value[1][0]) / 2,
  (bounds.value[0][1] + bounds.value[1][1]) / 2,
]);

const reactiveFeature = new ReactiveFeature();

useMapEventBus().provide();
useEditableFeature().provide(reactiveFeature);

const zoom = ref(8);
const mapObject = ref<Map | null>(null);
const drawLayer = ref<FeatureGroup | null>(null);

// Drawing state
const showDescriptionModal = ref(false);
const description = ref("");
let currentGeometry: Geometry | null = null;

watch(
  reactiveFeature.feature,
  (feature) => {
    if (feature) {
      // prepareAreaOfInterest(feature);
    } else {
      // areaOfInterest.value = null;
    }
  },
  { deep: true }
);

function mapLoaded(map: Map) {
  mapObject.value = map;
}

async function submitIssue() {
  if (!currentGeometry || !description.value) return;

  try {
    await $fetch("/api/issues/add", {
      method: "POST",
      body: {
        description: description.value,
        geometry: currentGeometry,
      },
    });

    // Clear the current drawing
    drawLayer.value?.clearLayers();
    description.value = "";
    showDescriptionModal.value = false;
    currentGeometry = null;

    // Optionally refresh the issues on the map
    // await refreshIssues();
  } catch (error) {
    console.error("Failed to create issue:", error);
    // Show error message to user
  }
}

function cancelIssue() {
  drawLayer.value?.clearLayers();
  description.value = "";
  showDescriptionModal.value = false;
  currentGeometry = null;
  activeDrawingTool.value = null;
}
</script>
