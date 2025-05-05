<template>
  <div>
    <v-btn
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
const eventBus = useMapEventBus().inject();

const drawingTools = [
  { type: "point", icon: "mdi-vector-point", label: "Teken punt" },
  { type: "line", icon: "mdi-vector-polyline", label: "Teken lijn" },
  { type: "polygon", icon: "mdi-vector-polygon", label: "Teken vlak" },
];
function startDrawing(tool: string) {
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
</script>

<style></style>
