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
            <SizeCalculator v-model="controlsSize">
              <div class="mobile-controls-container">
                <!-- Control buttons -->
                <div class="mobile-control-buttons">
                  <!-- Layer switcher button -->
                  <v-btn
                    icon
                    size="small"
                    class="layer-switcher-btn"
                    @click="showLayerSwitcher = !showLayerSwitcher"
                  >
                    <v-icon>mdi-layers</v-icon>
                  </v-btn>

                  <!-- Legend button -->
                  <v-btn
                    icon
                    size="small"
                    class="legend-btn"
                    @click="showLegend = !showLegend"
                  >
                    <v-icon>mdi-map-legend</v-icon>
                  </v-btn>
                </div>

                <!-- Layer switcher content -->
                <div v-if="showLayerSwitcher" class="mobile-control-content">
                  <MapLayerSwitcher v-model="preferredLayer" />
                </div>

                <!-- Legend content -->
                <div v-if="showLegend" class="mobile-control-content">
                  <MapLegend />
                </div>
              </div>
            </SizeCalculator>
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

// Mobile control overlays
const showLayerSwitcher = ref(false);
const showLegend = ref(false);

// Size tracking for the mobile controls
const controlsSize = ref<{ width: number; height: number }>({
  width: 0,
  height: 0,
});

// Get reference to the Map component
const mapRef = ref();

// Use the map resize composable (it handles recentering automatically)
useMapResize(mapRef, ref([50, 50, 50, 50]));

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

// Watch for controls size changes and update map padding
watch(controlsSize, (newSize) => {
  if (mapRef.value && mapRef.value.updatePadding) {
    // Update the map's padding based on mobile controls size
    mapRef.value.updatePadding(newSize);
  }
});

// Close overlays when clicking outside or when bottom sheet changes
watch(sheetHeight, () => {
  showLayerSwitcher.value = false;
  showLegend.value = false;
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

.mobile-controls-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.mobile-control-buttons {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: white;
}

.layer-switcher-btn,
.legend-btn {
  background: white !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
}

.mobile-control-content {
  border-top: 1px solid #e0e0e0;
  padding: 12px;
  background: white;
}
</style>
