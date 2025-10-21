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
    <MapControlContainer position="top-left">
      <MapSearch
        @selected="onSearchSelected"
        @search-expanded="onSearchExpanded"
      />
      <MapResetExtentControl @reset="resetToOriginalExtent" />
    </MapControlContainer>

    <!-- Top-right corner controls -->
    <MapControlContainer position="top-right">
      <MapLayerSwitcher
        v-show="!isMapVerySmall && !isSearchExpanded"
        v-model="preferredLayer"
      />
    </MapControlContainer>

    <!-- Bottom-left corner controls -->
    <MapControlContainer v-if="!isMapSmall" position="bottom-left">
      <SizeCalculator v-model="legendSize">
        <MobileCollapsible title="Legenda" icon="mdi-map-legend">
          <MapLegend />
        </MobileCollapsible>
      </SizeCalculator>
    </MapControlContainer>

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

    <ol-vector-layer ref="vectorLayer" :display-in-layer-switcher="false">
      <ol-source-vector>
        <ol-feature
          v-for="issue in markers"
          :key="`marker-${issue.id}`"
          :properties="getFeatureProperties(issue)"
        >
          <ol-geom-point :coordinates="toPointCoords(issue)" />
          <ol-style>
            <ol-style-circle :radius="mobile ? 10 : 8">
              <ol-style-fill :color="issue.color" />
              <ol-style-stroke
                :color="isSelected(issue) ? 'black' : 'white'"
                :width="2"
              />
            </ol-style-circle>
          </ol-style>
        </ol-feature>

        <ol-feature
          v-for="issue in lines"
          :key="`line-${issue.id}`"
          :properties="getFeatureProperties(issue)"
        >
          <ol-geom-line-string :coordinates="toLineCoords(issue)" />
          <ol-style>
            <ol-style-stroke
              :color="issue.color"
              :width="isSelected(issue) ? (mobile ? 8 : 6) : mobile ? 5 : 3"
            />
          </ol-style>
        </ol-feature>

        <ol-feature
          v-for="issue in polygons"
          :key="`polygon-${issue.id}`"
          :properties="getFeatureProperties(issue)"
        >
          <ol-geom-polygon :coordinates="toPolygonCoords(issue)" />
          <ol-style>
            <ol-style-stroke
              :color="isSelected(issue) ? 'black' : issue.color"
              :width="2"
            />
            <ol-style-fill :color="getPolygonFillColor(issue)" />
          </ol-style>
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
import { Style, Circle, Fill, Stroke } from "ol/style";
import { click } from "ol/events/condition";
import type TileLayer from "ol/layer/Tile";
import type { BBox } from "geojson";
import { easeOut } from "ol/easing";
import type { FitOptions } from "ol/View";

interface Size {
  width: number;
  height: number;
}

// Use lightweight map issues for rendering (only id, title, color, geometry, imageUrl)
const { issues } = storeToRefs(
  useIssues({ fields: "id,title,color,geometry,imageUrl" })
);

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
const lufolabelsSource = useTemplateRef("lufolabels-source");
const luchtfotoSource = useTemplateRef("luchtfoto-source");
const light = useTemplateRef("light");
const fietskaart = useTemplateRef("fietskaart");

// Watch for layer visibility changes and update preferred layer
watchLayerVisibility(light, "Licht");
watchLayerVisibility(fietskaart, "Fiets");
watchLayerVisibility(luchtfotoSource, "Foto");

const defaultPadding = [50, 50, 50, 50]; // [top, right, bottom, left]
const currentPadding = ref(defaultPadding);

const legendSize = ref<Size>({ width: 0, height: 0 });

// Update padding when size changes
watch(legendSize, async () => {
  currentPadding.value = [
    50, // top
    50, // right
    legendSize.value.height + 20, // bottom
    legendSize.value.width + 20, // left
  ];
});

function setBbox(bbox: BBox, options: FitOptions = {}) {
  if (!view.value) return;
  const padding = options.padding || currentPadding.value;
  view.value.fit(bbox, { ...options, padding });
}

function onSearchSelected(bbox: BBox) {
  setBbox(bbox, {
    padding: currentPadding.value,
    maxZoom: 17,
    easing: easeOut,
    duration: 1000,
  });
}

const isSearchExpanded = ref(false);

function onSearchExpanded(expanded: boolean) {
  isSearchExpanded.value = expanded;
}

function resetToOriginalExtent() {
  if (!issues.value || issues.value.length === 0) return;

  const bbox = getIssuesBbox(issues.value);
  if (!bbox) return;

  setBbox(bbox, {
    padding: currentPadding.value,
    easing: easeOut,
    duration: 1000,
  });
}

const view = useTemplateRef("view");
const mapRef = useTemplateRef("mapRef");
const firstLoad = ref(true);

const { mobile } = useDisplay();

// Use the map bounds composable to track bounding box changes
// useMapBounds(mapRef);

watch([view, issues, selectedIssue], () => {
  if (view.value && issues.value.length > 0) {
    // If there's a selected issue with geometry, zoom to it
    if (selectedIssue.value?.geometry) {
      recenterOnSelectedIssue();
      firstLoad.value = false;
    } else {
      // Otherwise, fit all issues
      const bbox = getIssuesBbox(issues.value);
      if (!bbox) return;
      setBbox(bbox);
      firstLoad.value = false;
    }
  }
});

const { isEditing } = useIsEditing();
const modifyEnabled = computed(() => {
  return isEditing.value && selectedIssue.value;
});

const addFeature = ref(null);
const isDrawing = computed(() => {
  // @ts-expect-error - isDrawing is a property of the addFeature component
  return addFeature.value?.isDrawing || false;
});

const center = ref([687858.9021986299, 6846820.48790154]);
const zoom = ref(13);
const projection = ref("EPSG:3857");

// Setup resize observer to handle container size changes
const { mapHeight, recenterOnSelectedIssue } = useMapResize(mapRef);

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
  const issue = issues.value?.find((i: MapIssue) => i.id === issueId);
  if (!issue) return;

  if (feature.getGeometry()!.getType() === "Point") {
    return new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: issue.color }),
        stroke: new Stroke({
          color: isSelected(issue) ? "black" : "white",
          width: 2,
        }),
      }),
    });
  } else if (feature.getGeometry()!.getType() === "LineString") {
    return new Style({
      stroke: new Stroke({
        color: issue.color,
        width: isSelected(issue) ? 6 : 3,
      }),
    });
  } else
    return new Style({
      stroke: new Stroke({
        color: isSelected(issue) ? "black" : issue.color,
        width: 2,
      }),
      fill: new Fill({
        color: getPolygonFillColor(issue),
      }),
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
  return (
    issues.value?.filter(
      (issue: MapIssue): issue is MapIssue => issue.geometry?.type === "Point"
    ) ?? []
  );
});

const polygons = computed(() => {
  return (
    issues.value?.filter(
      (issue: MapIssue): issue is MapIssue => issue.geometry?.type === "Polygon"
    ) ?? []
  );
});

const lines = computed(() => {
  return (
    issues.value?.filter(
      (issue: MapIssue): issue is MapIssue =>
        issue.geometry?.type === "LineString"
    ) ?? []
  );
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
  const color = issue.color || "#000000";
  return color + "40"; // 40 is 25% opacity in hex
}

function navigateToIssue(issue: MapIssue) {
  navigateTo(`/kaart/${issue.id}`);
}

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
</style>
