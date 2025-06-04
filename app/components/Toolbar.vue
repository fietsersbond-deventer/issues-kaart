<template>
  <div class="d-flex align-center">
    <div v-if="!selectedId" class="d-flex align-center">
      <v-btn
        v-for="tool in drawingTools"
        :key="tool.type"
        :icon="tool.icon"
        :class="{ 'active-tool': activeDrawingTool === tool.type }"
        color="primary"
        :aria-label="tool.label"
        @click="startDrawing(tool.type)"
      />
    </div>

    <v-divider v-if="$slots.default" vertical class="mx-2" />

    <div class="d-flex align-center">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
const eventBus = useMapEventBus().inject();
const activeDrawingTool = ref<string | null>(null);

const { selectedId } = storeToRefs(useSelectedIssue());

const drawingTools = [
  { type: "point", icon: "mdi-vector-point", label: "Teken punt" },
  { type: "line", icon: "mdi-vector-polyline", label: "Teken lijn" },
  { type: "polygon", icon: "mdi-vector-polygon", label: "Teken vlak" },
];

function startDrawing(tool: string) {
  if (!eventBus) return;

  // If clicking the same tool, deactivate it
  if (activeDrawingTool.value === tool) {
    activeDrawingTool.value = null;
    eventBus.emit("clearFeature");
    return;
  }

  // Start new drawing based on selected tool
  activeDrawingTool.value = tool;
  eventBus.emit("clearFeature");

  switch (tool) {
    case "point":
      eventBus.emit("startPoint");
      break;
    case "line":
      eventBus.emit("startLine");
      break;
    case "polygon":
      eventBus.emit("startPolygon");
      break;
    default:
      return;
  }
}
</script>

<style>
.active-tool {
  border: 2px solid blue; /* or any other style to indicate the active tool */
  background-color: rgba(var(--v-theme-primary), 0.12);
}
</style>
