<template>
  <ol-map
    ref="mapRef"
    :class="{ 'map-small': isMapSmall, 'map-very-small': isMapVerySmall }"
    :controls="[]"
  >
    <ol-view ref="view" :projection="projection" />

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

    <ol-vector-layer
      ref="vectorLayer"
      :display-in-layer-switcher="false"
      :style="style"
    >
      <ol-source-vector>
        <ol-feature
          v-for="issue in markers"
          :key="`marker-${issue.id}`"
          :properties="getFeatureProperties(issue)"
        >
          <ol-geom-point :coordinates="toPointCoords(issue)" />
        </ol-feature>

        <ol-feature
          v-for="issue in lines"
          :key="`line-${issue.id}`"
          :properties="getFeatureProperties(issue)"
        >
          <ol-geom-line-string :coordinates="toLineCoords(issue)" />
        </ol-feature>

        <ol-feature
          v-for="issue in polygons"
          :key="`polygon-${issue.id}`"
          :properties="getFeatureProperties(issue)"
        >
          <ol-geom-polygon :coordinates="toPolygonCoords(issue)" />
        </ol-feature>

        <!-- editor -->
        <ol-interaction-modify
          v-if="modifyEnabled"
          :features="selectedFeatures"
          @modifyend="onModifyEnd"
        /> </ol-source-vector
    ></ol-vector-layer>

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
import type { MapIssue } from "~~/shared/types/Issue";
import type { SelectEvent } from "ol/interaction/Select";
import { Collection, type Feature } from "ol";
import type { ModifyEvent } from "ol/interaction/Modify";
import { GeoJSON } from "ol/format";
import type { LineString, Point, Polygon } from "ol/geom";
import { click } from "ol/events/condition";
import type Layer from "ol/layer/Layer";
import { getIssueMapStyle } from "../utils/issueMapStyle";
import {
  getFeatureProperties,
  toPointCoords,
  toLineCoords,
  toPolygonCoords,
} from "../utils/issueMapGeometry";
defineOptions({ name: "IssueMap" });

// Use lightweight map issues for rendering (only essential fields)
const { issue: selectedIssue, selectedId } = storeToRefs(useSelectedIssue());
const { selectedIssues } = useSelectedIssues();
const route = useRoute();

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

const { isEditing } = useIsEditing();
const modifyEnabled = computed(() => {
  return isEditing.value && selectedIssue.value;
});

const addFeature = ref(null);
const isDrawing = computed(() => {
  // @ts-expect-error - isDrawing is a property of the addFeature component
  return addFeature.value?.isDrawing || false;
});

const { zoom } = useMapView(mapRef);
const projection = ref("EPSG:3857");

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

const markers = computed(() => {
  return selectedIssues.value.filter(
    (issue) => issue.geometry?.type === "Point",
  );
});

const polygons = computed(() => {
  return selectedIssues.value.filter(
    (issue) => issue.geometry?.type === "Polygon",
  );
});

const lines = computed(() => {
  return selectedIssues.value.filter(
    (issue) => issue.geometry?.type === "LineString",
  );
});

function navigateToIssue(issue: Pick<MapIssue, "id">) {
  const { query } = route;
  navigateTo({ path: `/kaart/${issue.id}`, query });
}

// Fallback function to create a simple circle icon if icon_data_url is missing
const selectedFeatures = ref<Collection<Feature<Point | LineString | Polygon>>>(
  new Collection(),
);

// ol Select stops at the first hit that fails `filter`, so exclude the layer instead
function isNotAreaLayer(layer: Layer) {
  return layer.getClassName() !== "area-layer";
}

function onFeatureSelect(event: SelectEvent) {
  const selected = event.selected;
  if (selected && selected.length > 0) {
    const feature = selected[0] as Feature<Point | LineString | Polygon>;
    const properties = feature.getProperties();
    const issueId = properties.id;
    if (issueId === selectedId.value) {
      selectedFeatures.value.push(feature);
      return;
    } else {
      selectedId.value = issueId;
      navigateToIssue({ id: issueId } as MapIssue);
      emit("feature-clicked");
    }
  } else {
    selectedFeatures.value.clear();
  }
}

function onModifyEnd(event: ModifyEvent) {
  const writer = new GeoJSON();
  const feature = event.features.item(0);
  if (!feature) {
    console.warn("No feature modified");
    return;
  }
  const geoJSON = writer.writeFeatureObject(feature, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });

  // Update selectedIssue geometry
  // @ts-expect-error - geometry type is complex
  selectedIssue.value!.geometry = geoJSON.geometry;

  // ALSO update the geometry in the issues array (which the map renders from)
  // This prevents the map from reverting to the old geometry
  const issueIndex = selectedIssues.value.findIndex(
    (i) => "id" in i && i.id === selectedId.value,
  );
  if (issueIndex !== -1) {
    // @ts-expect-error - geometry type is complex
    selectedIssues.value[issueIndex].geometry = geoJSON.geometry;
  }
}

const emit = defineEmits(["feature-clicked"]);

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
