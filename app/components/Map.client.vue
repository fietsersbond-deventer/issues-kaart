<template>
  <ol-map
    ref="mapRef"
    data-testid="issue-map"
    :class="{ 'map-small': isMapSmall, 'map-very-small': isMapVerySmall }"
    :controls="[]"
  >
    <!-- The children below use the map provided by ol-map. -->
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

    <!-- While drawing, hide the tooltip and stop clicks from selecting existing issues. -->
    <MapAddFeature ref="addFeature" />

    <!-- Add backgrounds first, then issues and area overlays.
         Layers with an explicit z-index can override this order. -->
    <MapBaseLayers />

    <MapIssueLayer
      ref="issueLayer"
      :issues="viewportIssues"
      :feature-style="style"
      :modify-enabled="modifyEnabled"
      :selected-id="selectedId"
      :selected-features="selectedFeatures"
      @modifyend="onModifyEnd"
    />

    <MapAreas />

    <ol-attribution-control :collapsible="mobile" />

    <MapTooltip :is-drawing />
    <div v-if="viewportError" class="map-load-error" role="alert">{{ viewportError }}</div>

    <!-- Selection stays last so the interaction order matches the original map.
         Areas handle their own clicks, so exclude them here. -->
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
import type IssueLayer from "./map/IssueLayer.vue";
import type AddFeature from "./map/AddFeature.vue";
import { click } from "ol/events/condition";
import { createIssueMapStyleCache } from "../utils/issueMapStyle";
// This component puts the map together and connects it to the page layout.
// BaseLayers sets up the backgrounds; IssueLayer draws the issues and lets users
// reshape them. Selection, navigation and geometry updates are handled by
// useMapIssueInteractions. View tracking, resizing and fitting use the existing
// useMapView, useMapResize and useMapFocus composables.
defineOptions({ name: "IssueMap" });

// Desktop and mobile layouts pass their controls through these slots.
defineSlots<{
  "top-left-controls"?: () => unknown;
  "bottom-left-controls"?: (props: { mapWidth: number }) => unknown;
}>();
const emit = defineEmits<{ "feature-clicked": [] }>();
const issueLayer = useTemplateRef<InstanceType<typeof IssueLayer>>("issueLayer");
const addFeature = useTemplateRef<InstanceType<typeof AddFeature>>("addFeature");
const isDrawing = computed(() => addFeature.value?.isDrawing || false);

const {
  selectedId,
  selectedIssues,
  selectedFeatures,
  modifyEnabled,
  isNotAreaLayer,
  onFeatureSelect,
  onModifyEnd,
} = useMapIssueInteractions(() => emit("feature-clicked"), computed(() => issueLayer.value?.source), isDrawing);

// BaseLayers and the layer picker read and write the same saved preference.
const { preferredLayer } = useMapLayerPreference();

// [top, right, bottom, left]
const currentPadding = ref<[number, number, number, number]>([100, 50, 50, 50]);

interface Size {
  width: number;
  height: number;
}
const bottomLeftSize = ref<Size>({ width: 0, height: 0 });

// Leave room for the controls when fitting the map: on the left for a tall panel,
// below for a wide one. A hidden panel reports zero, leaving only the normal margin.
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
const { issues: viewportIssues, error: viewportError } = useMapViewportIssues(mapRef, selectedIssues, selectedId);

const { mobile } = useVDisplay();

const { zoom } = useMapView(mapRef);

// Refit when the map container changes size, for example when the bottom sheet moves.
const { mapHeight, mapWidth } = useMapResize(mapRef);
const mapSize = computed<[number, number]>(() => [
  mapWidth.value,
  mapHeight.value,
]);

const { refit } = useMapFocus(mapRef, currentPadding, mapSize);

// On mobile, hide controls as the bottom sheet leaves less room for the map.
const isMapVerySmall = computed(() => {
  if (mobile.value) {
    return mapHeight.value > 0 && mapHeight.value / window.innerHeight < 0.35;
  }
  return false;
});

const isMapSmall = computed(() => {
  if (mobile.value) {
    return mapHeight.value > 0 && mapHeight.value / window.innerHeight < 0.45;
  }
  return false;
});

// Use the same styling for the issue layer and the selection overlay.
// Read the current selection and zoom each time OpenLayers calls this function.
const issuesById = computed(() => new Map(viewportIssues.value.map(issue => [issue.id, issue])));
const cachedStyle = createIssueMapStyleCache();
function style(feature: Feature) {
  const issue = issuesById.value.get(feature.get("id"));
  return cachedStyle(feature, issue, issue?.id === selectedId.value, zoom.value);
}

// Parents can request a refit or change the background through this ref.
// Reset shows the overview; a normal refit follows the current focus target.
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

<style scoped>
.map-load-error { position: absolute; top: 12px; left: 60px; background: white; color: #b71c1c; padding: 12px; z-index: 10; }
</style>
