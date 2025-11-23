<template>
  <SizeCalculator v-model="controlsSize">
    <div class="adaptive-controls">
      <!-- Always show controls if space is sufficient -->
      <div v-if="!shouldUseButtons" class="permanent-controls">
        <SizeCalculator v-model="permanentControlsSize">
          <MapLegend />
          <MapLayerSwitcher v-model="layer" />
        </SizeCalculator>
      </div>

      <!-- Show buttons when space is limited -->
      <template v-else>
        <!-- Control buttons -->
        <div class="control-buttons">
          <!-- Layer switcher button -->
          <v-btn
            icon
            size="small"
            class="control-btn"
            @click="showLayerSwitcher = !showLayerSwitcher"
          >
            <v-icon>mdi-layers</v-icon>
            <v-tooltip activator="parent" location="top">
              Kaartlagen
            </v-tooltip>
          </v-btn>

          <!-- Legend button -->
          <v-btn
            icon
            size="small"
            class="control-btn"
            @click="showLegend = !showLegend"
          >
            <v-icon>mdi-map-legend</v-icon>
            <v-tooltip activator="parent" location="top"> Legenda </v-tooltip>
          </v-btn>
        </div>

        <!-- Layer switcher content -->
        <div v-if="showLayerSwitcher" class="control-content">
          <MapLayerSwitcher v-model="layer" />
        </div>

        <!-- Legend content -->
        <div v-if="showLegend" class="control-content">
          <MapLegend />
        </div>
      </template>
    </div>
  </SizeCalculator>
</template>

<script setup lang="ts">
const layer = defineModel<string>();

// Get map size from composable using injection
const { mapHeight, mapWidth } = useMapSize();

// Track the size of the controls
const controlsSize = ref<{ width: number; height: number }>({
  width: 0,
  height: 0,
});

// Track the size of the permanent controls (for measurement)
const permanentControlsSize = ref<{ width: number; height: number }>({
  width: 0,
  height: 0,
});

// Button states for compact mode
const showLayerSwitcher = ref(false);
const showLegend = ref(false);

// Track whether we should use buttons (reactive state)
const shouldUseButtons = ref(false);

// Watch for size changes and determine if we should switch to buttons
watch(
  [mapWidth, mapHeight, permanentControlsSize],
  () => {
    // Skip if map size is not yet known
    if (mapWidth.value === 0 || mapHeight.value === 0) {
      shouldUseButtons.value = false;
      return;
    }

    // Skip if we don't have measurements yet
    if (
      permanentControlsSize.value.width === 0 ||
      permanentControlsSize.value.height === 0
    ) {
      shouldUseButtons.value = false;
      return;
    }

    // Check if permanent controls don't take up too much of the map
    // Controls are in the bottom-left corner, so we're more lenient with width
    const MAX_WIDTH_RATIO = 0.3; // % of map width
    const MAX_HEIGHT_RATIO = 0.35; // % of map height

    const controlsTooBig =
      permanentControlsSize.value.width > mapWidth.value * MAX_WIDTH_RATIO ||
      permanentControlsSize.value.height > mapHeight.value * MAX_HEIGHT_RATIO;

    shouldUseButtons.value = controlsTooBig;

    // Debug logging (remove in production)
    if (import.meta.dev) {
      console.debug("AdaptiveControls space check:", {
        mapWidth: mapWidth.value,
        mapHeight: mapHeight.value,
        permanentControlsWidth: permanentControlsSize.value.width,
        permanentControlsHeight: permanentControlsSize.value.height,
        maxAllowedWidth: mapWidth.value * MAX_WIDTH_RATIO,
        maxAllowedHeight: mapHeight.value * MAX_HEIGHT_RATIO,
        controlsTooBig,
        shouldUseButtons: shouldUseButtons.value,
      });
    }
  },
  { deep: true }
);

// Emit size changes for parent components to adjust map padding
const emit = defineEmits<{
  "update:size": [{ width: number; height: number }];
}>();

watch(controlsSize, (newSize) => {
  emit("update:size", newSize);
});

// Reset button states when switching to permanent mode
watch(shouldUseButtons, (useButtons) => {
  if (!useButtons) {
    showLayerSwitcher.value = false;
    showLegend.value = false;
  }
});

// Expose state for external control (e.g., close overlays on external events)
defineExpose({
  closeOverlays: () => {
    showLayerSwitcher.value = false;
    showLegend.value = false;
  },
});
</script>

<style scoped>
.adaptive-controls {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.permanent-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow-y: auto; /* Allow scrolling if content is too tall */
  max-height: 90vh;
}

.control-buttons {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: white;
}

.control-btn {
  background: white !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
}

.control-content {
  border-top: 1px solid #e0e0e0;
  padding: 12px;
  background: white;
  max-height: 50vh; /* Limit overlay height */
  overflow-y: auto; /* Allow scrolling in overlays */
}
</style>
