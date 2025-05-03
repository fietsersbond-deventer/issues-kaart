<template>
  <div>
    <UButton
      v-for="tool in drawingTools"
      :key="tool.type"
      :icon="tool.icon"
      color="primary"
      :aria-label="tool.label"
      @click="startDrawing(tool.type)"
    />
  </div>
</template>

<script lang="ts" setup>
import type { Map } from "leaflet";

const mapPromise = useMap().injectMap();
if (!mapPromise) throw new Error("No mapPromise provided yet");
const eventBus = useMapEventBus().inject();
const mapObject = shallowRef<Map | null>(null);

const drawingTools = [
  { type: "point", icon: "mdi-vector-point", label: "Teken punt" },
  { type: "line", icon: "mdi-vector-polyline", label: "Teken lijn" },
  { type: "polygon", icon: "mdi-vector-polygon", label: "Teken vlak" },
];
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

onMounted(async () => {
  mapObject.value = await mapPromise;
});
</script>

<style></style>
