<template>
  <ol-map
    ref="mapRef"
    :class="{ 'map-small': isMapSmall, 'map-very-small': isMapVerySmall }"
    :controls="[]"
  >
    <ol-view projection="EPSG:3857" />

    <MapControlContainer position="top-left">
      <slot name="top-left-controls" />
      <MapResetExtentControl @reset="resetToOriginalExtent" />
    </MapControlContainer>

    <MapFilterSummary />

    <MapControlContainer
      v-if="$slots['bottom-left-controls']"
      position="bottom-left"
    >
      <SizeCalculator v-model="bottomLeftSize">
        <slot name="bottom-left-controls" :map-width="mapWidth" />
      </SizeCalculator>
    </MapControlContainer>

    <MapAddFeature ref="addFeature" />

    <MapBaseLayers />

    <MapIssueLayer
      :issues="selectedIssues"
      :feature-style="style"
      :modify-enabled="modifyEnabled"
      :selected-features="selectedFeatures"
      @modifyend="onModifyEnd"
    />

    <MapAreas />

    <ol-attribution-control :collapsible="mobile" />

    <MapTooltip :is-drawing />

    <ol-interaction-select
      v-if="!isDrawing"
      :condition="click"
      :hit-tolerance="mobile ? 15 : 5"
      :layers="isNotAreaLayer"
      :style
      @select="onFeatureSelect"
    />
  </ol-map>
</template>

<script setup lang="ts">
import type { Feature } from "ol";
import type AddFeature from "./map/AddFeature.vue";
import { click } from "ol/events/condition";
import { getIssueMapStyle } from "../utils/issueMapStyle";
defineOptions({ name: "IssueMap" });

defineSlots<{
  "top-left-controls"?: () => unknown;
  "bottom-left-controls"?: (props: { mapWidth: number }) => unknown;
}>();
const emit = defineEmits<{ "feature-clicked": [] }>();
const {
  selectedId,
  selectedIssues,
  selectedFeatures,
  modifyEnabled,
  isNotAreaLayer,
  onFeatureSelect,
  onModifyEnd,
} = useMapIssueInteractions(() => emit("feature-clicked"));

const { preferredLayer } = useMapLayerPreference();

// [top, right, bottom, left]
const currentPadding = ref<[number, number, number, number]>([100, 50, 50, 50]);

interface Size {
  width: number;
  height: number;
}
const bottomLeftSize = ref<Size>({ width: 0, height: 0 });

// Keep the bottom-left controls clear of the fitted extent; a hidden panel measures 0
watch(bottomLeftSize, ({ width, height }) => {
  if (width < height) {
    currentPadding.value = [100, 50, 50, width + 50];
  } else {
    currentPadding.value = [100, 50, height + 50, 50];
  }
  refit();
});

function resetToOriginalExtent() {
  refit({ overview: true, duration: 1000 });
}

const mapRef = useTemplateRef("mapRef");

const { mobile } = useVDisplay();

const addFeature = useTemplateRef<InstanceType<typeof AddFeature>>("addFeature");
const isDrawing = computed(() => addFeature.value?.isDrawing || false);

const { zoom } = useMapView(mapRef);

// Setup resize observer to handle container size changes
const { mapHeight, mapWidth } = useMapResize(mapRef);
const mapSize = computed<[number, number]>(() => [
  mapWidth.value,
  mapHeight.value,
]);

const { refit } = useMapFocus(mapRef, currentPadding, mapSize);

// Hide controls based on actual map height (available space for the map)
const isMapVerySmall = computed(() => {
  if (mobile.value) {
    // On mobile, use relative size based on available screen percentage
    return mapHeight.value > 0 && mapHeight.value / window.innerHeight < 0.35;
  }
  return false;
});

const isMapSmall = computed(() => {
  if (mobile.value) {
    // On mobile, use relative size based on available screen percentage
    return mapHeight.value > 0 && mapHeight.value / window.innerHeight < 0.45;
  }
  return false;
});

function style(feature: Feature) {
  const issue = selectedIssues.value.find((issue) => issue.id === feature.get("id"));
  return getIssueMapStyle(feature, issue, issue?.id === selectedId.value, zoom.value);
}

// Expose functions to parent components
defineExpose({
  resetToOriginalExtent,
  refit,
  preferredLayer,
});
</script>

<style>
/* Ensure the ol-counter is hidden in the layer switcher */
:deep(.ol-counter) {
  display: none !important;
}

:deep(.ol-control.ol-layerswitcher-image .ol-counter) {
  display: none !important;
}
</style>

<style>
.map-icon-container {
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
}

.map-icon-container::before {
  content: "";
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  z-index: -1;
}

/* Legacy styles for old approach */
.map-icon {
  background: white;
  border-radius: 50%;
  padding: 4px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.map-icon-simple {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.icon-text {
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
