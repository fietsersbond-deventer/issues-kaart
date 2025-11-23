<template>
  <v-layout class="map-layout">
    <v-main class="map-main" :style="{ height: `${100 - sheetHeight}%` }">
      <Map ref="mapRef" class="fill-height">
        <template #top-left-controls>
          <MapControlContainer position="top-left">
            <MapResetExtentControl @reset="handleResetExtent" />
          </MapControlContainer>
        </template>

        <template #bottom-left-controls="{ isSmall }">
          <MapControlContainer v-show="!isSmall" position="bottom-left">
            <MapAdaptiveControls
              ref="adaptiveControlsRef"
              v-model="preferredLayer"
              @update:size="handleControlsResize"
            />
          </MapControlContainer>
        </template>
      </Map>
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
  defaultHeight: 50,
  minHeight: 20,
  maxHeight: 75,
  snapPoints: [40, 75],
});

// Get reference to the Map component
const mapRef = ref();

// Get reference to the adaptive controls
const adaptiveControlsRef = ref();

// Create a computed property for preferredLayer that syncs with the map
const preferredLayer = computed({
  get: () => mapRef.value?.preferredLayer || "Licht",
  set: (value) => {
    if (mapRef.value) {
      mapRef.value.preferredLayer = value;
    }
  },
});

// Handle reset extent by calling the Map component's method
function handleResetExtent() {
  if (mapRef.value) {
    mapRef.value.resetToOriginalExtent();
  }
}

// Handle controls resize and update map padding
function handleControlsResize(newSize: { width: number; height: number }) {
  if (mapRef.value && mapRef.value.updatePadding) {
    mapRef.value.updatePadding(newSize);
  }
}

// Close overlays when bottom sheet changes
watch(sheetHeight, () => {
  if (adaptiveControlsRef.value) {
    adaptiveControlsRef.value.closeOverlays();
  }
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
