<template>
  <div class="w-full h-full relative">
    <MapBase
      v-model:zoom="zoom"
      v-model:center="center"
      v-model:bounds="bounds"
      :url
      :attribution
      @ready="mapLoaded"
    >
      <MapEditableFeatureLayer />
      <!-- Drawing toolbar -->
      <div
        class="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2 flex gap-2"
      >
        <UButton
          v-for="tool in drawingTools"
          :key="tool.type"
          :icon="tool.icon"
          color="primary"
          :aria-label="tool.label"
          @click="startDrawing(tool.type)"
        />
      </div>

      <!-- Description input dialog -->
      <UModal v-model="showDescriptionModal">
        <div class="p-4">
          <h2 class="text-lg font-bold mb-4">Add Issue Description</h2>
          <UTextarea
            v-model="description"
            placeholder="Describe the issue..."
            class="mb-4"
          />
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="cancelIssue">Cancel</UButton>
            <UButton @click="submitIssue">Submit</UButton>
          </div>
        </div>
      </UModal>
    </MapBase>
  </div>
</template>

<script setup lang="ts">
import { isBoundsTuples } from "~/types/IBounds";
import "leaflet/dist/leaflet.css";

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

const zoom = ref(8);
const mapObject = ref<Map | null>(null);
const drawLayer = ref<FeatureGroup | null>(null);

// Drawing state
const showDescriptionModal = ref(false);
const description = ref("");
let currentGeometry: Geometry | null = null;

const drawingTools = [
  { type: "point", icon: "i-lucide-map-pin", label: "Draw Point" },
  { type: "line", icon: "i-lucide-arrow-right", label: "Draw Line" },
  { type: "polygon", icon: "i-lucide-triangle", label: "Draw Polygon" },
];

function mapLoaded(map: Map) {
  mapObject.value = map;

  // Handle draw events
  map.on("draw:created", (e: any) => {
    const layer = e.layer;
    if (drawLayer.value && layer) {
      drawLayer.value.addLayer(layer);
      currentGeometry = (layer as any).toGeoJSON().geometry;
      showDescriptionModal.value = true;
    }
  });

  // Setup resize handling
  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize();
  });
  resizeObserver.observe(map.getContainer());
}

const eventBus = useMapEventBus().inject();
function startDrawing(tool: string) {
  if (!mapObject.value) return;

  switch (tool) {
    case "point":
      eventBus?.emit("startPoint");
      break;
    case "line":
      eventBus?.emit("startLine");
      break;
    case "polygon":
      eventBus?.emit("startPolygon");
      break;
    default:
      return;
  }
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
    activeDrawingTool.value = null;

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

const fitted = ref(false);
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
      if (!fitted.value) {
        mapObject.value.fitBounds(bounds.value);
        fitted.value = true;
      }
    }
  },
  { immediate: true, deep: true }
);
</script>
