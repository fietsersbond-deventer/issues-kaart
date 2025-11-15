<template>
  <ol-map
    ref="mapRef"
    :class="{ 'map-small': isMapSmall, 'map-very-small': isMapVerySmall }"
    :controls="[]"
  >
    <ol-view
      ref="view"
      :center="center"
      :zoom="zoom"
      :projection="projection"
    />

    <!-- Top-left corner controls -->
    <slot name="top-left-controls">
      <MapControlContainer position="top-left">
        <MapResetExtentControl @reset="resetToOriginalExtent" />
      </MapControlContainer>
    </slot>

    <!-- Bottom-left corner controls -->
    <slot name="bottom-left-controls" :is-small="isMapSmall">
      <MapControlContainer v-show="!isMapSmall" position="bottom-left">
        <SizeCalculator v-model="legendSize">
          <MapLegend />
          <MapLayerSwitcher v-model="preferredLayer" />
        </SizeCalculator>
      </MapControlContainer>
    </slot>

    <MapAddFeature ref="addFeature" />

    <ol-tile-layer
      ref="light"
      title="Licht"
      :visible="preferredLayer === 'Licht'"
      :base-layer="true"
    >
      <ol-source-stadia-maps layer="alidade_smooth" />
    </ol-tile-layer>

    <ol-tile-layer
      ref="fietskaart"
      title="Fiets"
      :visible="preferredLayer === 'Fiets'"
      :base-layer="true"
    >
      <ol-source-xyz
        url="https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
        attributions='&copy; <a href="http://opencyclemap.org">OpenCycleMap</a>'
      />
    </ol-tile-layer>

    <ol-tile-layer
      ref="luchtfoto"
      title="Foto"
      :visible="preferredLayer === 'Foto'"
      :base-layer="true"
    >
      <ol-source-tile-wms
        ref="luchtfoto-source"
        url="https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0"
        layers="Actueel_ortho25"
        attributions='&copy; <a href="https://www.kadaster.nl">Kadaster</a>'
        :preview="getPreview('/preview-luchtfoto.png')"
      />
    </ol-tile-layer>

    <ol-tile-layer
      ref="lufolabels"
      title="Straatnamen"
      :visible="preferredLayer === 'Foto'"
      :display-in-layer-switcher="false"
    >
      <ol-source-wmts
        ref="lufolabels-source"
        url="https://service.pdok.nl/bzk/luchtfotolabels/wmts/v1_0"
        layer="lufolabels"
        :projection="rdProjection"
        matrix-set="EPSG:28992"
        format="image/png"
        :display-in-layer-switcher="false"
        :preview="getPreview('/preview-lufolabels.png')"
      />
    </ol-tile-layer>

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

    <MapTooltip :is-drawing />

    <ol-interaction-select
      v-if="!isDrawing"
      :condition="click"
      :hit-tolerance="mobile ? 15 : 5"
      :style
      @select="onFeatureSelect"
    />
  </ol-map>
</template>

<script setup lang="ts">
import type { MapIssue } from "~/types/Issue";
import { register } from "ol/proj/proj4.js";
import { transform } from "ol/proj";
import proj4 from "proj4";
import Projection from "ol/proj/Projection";
import type { SelectEvent } from "ol/interaction/Select";
import { Collection, type Feature } from "ol";
import type { ModifyEvent } from "ol/interaction/Modify";
import { GeoJSON } from "ol/format";
import type { LineString, Point, Polygon } from "ol/geom";
import { Style, Circle, Fill, Stroke, Icon } from "ol/style";
import { click } from "ol/events/condition";
import type { BBox } from "geojson";
import { easeOut } from "ol/easing";
import type { FitOptions } from "ol/View";

interface Size {
  width: number;
  height: number;
}

// Use lightweight map issues for rendering (only essential fields)
const { issues: allIssues } = storeToRefs(
  useIssues({ fields: "id,title,legend_id,geometry,imageUrl" as const })
);

// Filter issues based on legend visibility
const { visibleLegendIds, isShowingAll } = storeToRefs(useLegendFilters());

const issues = computed(() => {
  return (
    allIssues.value?.filter((issue) => {
      // If issue has no legend_id, show it by default
      if (!issue.legend_id) return true;
      // Otherwise, check if the legend is visible
      return visibleLegendIds.value.has(issue.legend_id);
    }) ?? []
  );
});

const issuesBbox = computed(() => {
  return getIssuesBbox(issues.value);
});

const { issue: selectedIssue, selectedId } = storeToRefs(useSelectedIssue());
function isSelected(issue: MapIssue) {
  return issue.id === selectedId.value;
}

// Layer preference management
const { preferredLayer, watchLayerVisibility } = useMapLayerPreference();

function getPreview(url: string) {
  return function () {
    return [url];
  };
}

/**
 * Returns the properties object for any OpenLayers feature, with type safety.
 */
function getFeatureProperties(issue: MapIssue) {
  const { geometry, ...props } = issue;
  return props;
}

// preview images for layers
const luchtfotoSource = useTemplateRef("luchtfoto-source");
const light = useTemplateRef("light");
const fietskaart = useTemplateRef("fietskaart");

// Watch for layer visibility changes and update preferred layer
watchLayerVisibility(light, "Licht");
watchLayerVisibility(fietskaart, "Fiets");
watchLayerVisibility(luchtfotoSource, "Foto");

// [top, right, bottom, left]
const currentPadding = ref<[number, number, number, number]>([50, 50, 50, 50]);

const legendSize = ref<Size>({ width: 0, height: 0 });

// Update padding when size changes
watch(legendSize, async () => {
  currentPadding.value = [
    50, // top
    50, // right
    legendSize.value.height + 20, // bottom
    50, // left
  ];
});

function setBbox(bbox: BBox, options: FitOptions = {}) {
  if (!view.value) return;
  const padding = options.padding || currentPadding.value;
  view.value.fit(bbox, { ...options, padding });
}

function resetToOriginalExtent() {
  if (!allIssues.value || allIssues.value.length === 0) return;

  const bbox = getIssuesBbox(allIssues.value);
  if (!bbox) return;

  setBbox(bbox, {
    padding: [50, 50, 50, 50],
    easing: easeOut,
    duration: 1000,
  });
}

function updatePadding(controlsSize: Size) {
  currentPadding.value = [
    50, // top
    50, // right
    controlsSize.height + 20, // bottom
    50, // left
  ];
}

const view = useTemplateRef("view");
const mapRef = useTemplateRef("mapRef");
const firstLoad = ref(true);

const { mobile } = useDisplay();

// Use the map bounds composable to track bounding box changes
// useMapBounds(mapRef);

watch([view, allIssues, selectedIssue], () => {
  if (!view.value) return;

  if (allIssues.value.length > 0) {
    // If there are issues, zoom to them
    if (selectedIssue.value?.geometry) {
      recenterOnSelectedIssue();
      firstLoad.value = false;
    } else {
      // Otherwise, fit all issues (including filtered ones for initial view)
      const bbox = issuesBbox.value;
      if (bbox) {
        setBbox(bbox);
      }
      firstLoad.value = false;
    }
  } else if (firstLoad.value) {
    // No issues yet - zoom to default center/bounds
    firstLoad.value = false;
  }
});

// Watch for legend filter changes and zoom to visible issues
watch(
  visibleLegendIds,
  () => {
    // If we're back to show-all mode and there's a selected issue, zoom to it
    if (isShowingAll.value && selectedId.value) {
      recenterOnSelectedIssue();
    } else if (issuesBbox.value) {
      setBbox(issuesBbox.value, {
        padding: [50, 50, 50, 50],
        duration: 800, // Smooth animation
      });
    }
  },
  { deep: true }
);

const { isEditing } = useIsEditing();
const modifyEnabled = computed(() => {
  return isEditing.value && selectedIssue.value;
});

const addFeature = ref(null);
const isDrawing = computed(() => {
  // @ts-expect-error - isDrawing is a property of the addFeature component
  return addFeature.value?.isDrawing || false;
});

const { center, zoom } = useMapView(mapRef);
const projection = ref("EPSG:3857");

// Setup resize observer to handle container size changes
const { mapHeight, recenterOnSelectedIssue } = useMapResize(
  mapRef,
  currentPadding
);

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
  const properties = feature.getProperties();
  const issueId = properties.id;
  const issue = issues.value?.find((i) => i.id === issueId);
  if (!issue) return;

  // Provide default color if none specified (for backward compatibility)
  const issueColor = issue.legend?.color;

  // Set higher zIndex for selected features to bring them to the top
  const zIndex = isSelected(issue) ? 1000 : 1;

  if (feature.getGeometry()!.getType() === "Point") {
    // If the issue has an icon, use it with black circle when selected
    if (issue.legend?.icon) {
      if (issue.legend?.icon_data_url) {
        const minScale = 0.3; // Small when zoomed out (low zoom values)
        const maxScale = 0.7; // larger when zoomed in (high zoom values)
        const finalScale =
          minScale + ((zoom.value - 10) / 8) * (maxScale - minScale);
        // Clamp to min/max bounds
        const clampedScale = Math.max(minScale, Math.min(maxScale, finalScale));

        const iconStyle = new Style({
          image: new Icon({
            src: issue.legend.icon_data_url,
            scale: clampedScale,
            anchor: [0.5, 0.5],
          }),
          zIndex,
        });

        // Add black border overlay if selected (scale border with icon)
        if (isSelected(issue)) {
          // Calculate actual rendered icon size: base canvas size (64px) * current scale
          const baseIconSize = 64; // This matches the canvas size from iconCanvas.ts (32 * 2)
          const actualIconSize = baseIconSize * clampedScale;
          const iconRadius = actualIconSize / 2; // Icon is circular, so radius is half the size
          const borderRadius = iconRadius + 1; // Border extends 1px beyond the icon edge
          const borderStyle = new Style({
            image: new Circle({
              radius: Math.max(6, borderRadius),
              fill: new Fill({ color: "transparent" }),
              stroke: new Stroke({ color: "black", width: 3 }),
            }),
            zIndex: zIndex + 1, // Border slightly above the icon
          });
          return [iconStyle, borderStyle]; // Return both styles
        }

        return iconStyle;
      }

      const minRadius = 3; // Small when zoomed out (low zoom values)
      const maxRadius = 7; // Normal size when zoomed in (high zoom values)
      const finalRadius =
        minRadius + ((zoom.value - 10) / 8) * (maxRadius - minRadius);
      // Clamp to min/max bounds
      const clampedRadius = Math.max(
        minRadius,
        Math.min(maxRadius, finalRadius)
      );

      const circleStyle = new Style({
        image: new Circle({
          radius: clampedRadius,
          fill: new Fill({ color: issue.legend?.color || "#2196F3" }),
          stroke: new Stroke({
            color: "white",
            width: Math.max(1, clampedRadius / 6),
          }),
        }),
        zIndex,
      });

      // Add black border overlay if selected (scale with circle)
      if (isSelected(issue)) {
        const borderRadius = finalRadius + 3;
        const borderStyle = new Style({
          image: new Circle({
            radius: borderRadius,
            fill: new Fill({ color: "transparent" }),
            stroke: new Stroke({ color: "black", width: 3 }),
          }),
          zIndex: zIndex + 1, // Border slightly above the circle
        });
        return [circleStyle, borderStyle]; // Return both styles
      }

      return circleStyle;
    } else {
      // Fallback to circle for issues without icons
      return new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: issueColor }),
          stroke: new Stroke({
            color: isSelected(issue) ? "black" : "white",
            width: 2,
          }),
        }),
        zIndex,
      });
    }
  } else if (feature.getGeometry()!.getType() === "LineString") {
    const lineWidth = 3;
    const selectedLineWidth = 6;

    if (isSelected(issue as MapIssue)) {
      // Draw black border first (thicker), then colored line on top
      const borderStyle = new Style({
        stroke: new Stroke({
          color: "black",
          width: selectedLineWidth + 2, // 2px wider than the colored line
        }),
        zIndex: zIndex, // Border at base z-index
      });

      const lineStyle = new Style({
        stroke: new Stroke({
          color: issueColor,
          width: selectedLineWidth,
        }),
        zIndex: zIndex + 1, // Line slightly above the border
      });

      return [borderStyle, lineStyle]; // Return both styles - border first, then line
    } else {
      return new Style({
        stroke: new Stroke({
          color: issueColor,
          width: lineWidth,
        }),
        zIndex,
      });
    }
  } else
    return new Style({
      stroke: new Stroke({
        color: isSelected(issue as MapIssue) ? "black" : issueColor,
        width: 2,
      }),
      fill: new Fill({
        color: getPolygonFillColor(issue as MapIssue),
      }),
      zIndex,
    });
}

proj4.defs(
  "EPSG:28992",
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs"
);
register(proj4);
const rdProjection = new Projection({
  code: "EPSG:28992",
  extent: [-285401.92, 22598.08, 595401.92, 903401.92],
});

const markers = computed(() => {
  return issues.value.filter((issue) => issue.geometry?.type === "Point");
});

const polygons = computed(() => {
  return issues.value.filter((issue) => issue.geometry?.type === "Polygon");
});

const lines = computed(() => {
  return issues.value.filter((issue) => issue.geometry?.type === "LineString");
});

function toPointCoords(issue: MapIssue) {
  if (issue.geometry.type !== "Point") return [0, 0];
  return transform(issue.geometry.coordinates, "EPSG:4326", "EPSG:3857");
}

function toLineCoords(issue: MapIssue) {
  if (issue.geometry.type !== "LineString") return [[0, 0]];
  return issue.geometry.coordinates.map((coord) =>
    transform(coord, "EPSG:4326", "EPSG:3857")
  );
}

function toPolygonCoords(issue: MapIssue) {
  if (issue.geometry.type !== "Polygon") return [[[0, 0]]];
  return issue.geometry.coordinates.map((ring) =>
    ring.map((coord) => transform(coord, "EPSG:4326", "EPSG:3857"))
  );
}

function getPolygonFillColor(issue: MapIssue) {
  const color = issue.legend?.color || "#000000";
  return color + "40"; // 40 is 25% opacity in hex
}

function navigateToIssue(issue: MapIssue) {
  navigateTo(`/kaart/${issue.id}`);
}

// Fallback function to create a simple circle icon if icon_data_url is missing
const selectedFeatures = ref<Collection<Feature<Point | LineString | Polygon>>>(
  new Collection()
);

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
  const issueIndex = issues.value.findIndex(
    (i) => "id" in i && i.id === selectedId.value
  );
  if (issueIndex !== -1) {
    // @ts-expect-error - geometry type is complex
    issues.value[issueIndex].geometry = geoJSON.geometry;
  }
}

const emit = defineEmits(["feature-clicked"]);

// Expose functions to parent components
defineExpose({
  resetToOriginalExtent,
  preferredLayer,
  updatePadding,
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
/* Hide attribution when map is small - using global style */
.map-small .ol-attribution,
.map-small .ol-attribution.ol-uncollapsible,
.map-small .ol-control.ol-attribution {
  display: none !important;
}

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
