<template>
  <v-layout class="map-layout">
    <v-main class="map-main" :style="{ height: `${100 - sheetHeight}%` }">
      <Map class="fill-height" />
    </v-main>

    <div class="bottom-sheet" :style="{ height: `${sheetHeight}%` }">
      <div
        class="drag-handle"
        @touchstart="startDrag"
        @touchmove="onDrag"
        @touchend="endDrag"
        @mousedown="startDragMouse"
      >
        <div class="drag-indicator" />
      </div>
      <div ref="sheetContentRef" class="sheet-content">
        <NuxtPage />
      </div>
    </div>
  </v-layout>
</template>

<script setup lang="ts">
const {
  sheetHeight,
  sheetContentRef,
  startDrag,
  onDrag,
  endDrag,
  startDragMouse,
} = useBottomSheet({
  defaultHeight: 30,
  minHeight: 10,
  maxHeight: 75,
  snapPoints: [30, 75],
});
</script>

<style scoped>
.map-layout {
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-main {
  width: 100%;
  padding: 0 !important;
  margin: 0 !important;
  transition: height 0.3s ease;
}

.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  overflow: hidden;
  z-index: 6001 !important;
  transition: height 0.1s ease-out;
}

.drag-handle {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
  background: #f0f0f0;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  cursor: grab;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-indicator {
  width: 40px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
}

.sheet-content {
  overflow-y: auto;
  height: calc(100% - 24px);
}
</style>
