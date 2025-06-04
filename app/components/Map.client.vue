<template>
  <ol-map ref="mapRef">
    <ol-view
      ref="view"
      :center="center"
      :zoom="zoom"
      :projection="projection"
    />

    <MapAddFeature />

    <ol-tile-layer ref="light" title="Licht" :display-in-layer-switcher="false">
      <ol-source-stadia-maps layer="alidade_smooth" />
    </ol-tile-layer>

    <ol-tile-layer ref="luchtfoto" title="Luchtfoto" :visible="false">
      <ol-source-tile-wms
        url="https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0"
        layers="Actueel_ortho25"
        attributions='&copy; <a href="https://www.kadaster.nl">Kadaster</a>'
      />
    </ol-tile-layer>

    <ol-tile-layer ref="lufolabels" title="Straatnamen" :visible="false">
      <ol-source-wmts
        url="https://service.pdok.nl/bzk/luchtfotolabels/wmts/v1_0"
        layer="lufolabels"
        :projection="rdProjection"
        matrix-set="EPSG:28992"
        format="image/png"
      />
    </ol-tile-layer>

    <ol-tile-layer ref="fietskaart" title="Fietskaart" :visible="false">
      <ol-source-xyz
        url="https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
        attributions='&copy; <a href="http://opencyclemap.org">OpenCycleMap</a>'
      />
    </ol-tile-layer>

    <ol-vector-layer ref="vectorLayer" :display-in-layer-switcher="false">
      <ol-source-vector>
        <ol-feature
          v-for="issue in markers"
          :key="`marker-${issue.id}`"
          :properties="{ issueId: issue.id }"
        >
          <ol-geom-point :coordinates="toPointCoords(issue)" />
          <ol-style>
            <ol-style-circle :radius="7">
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
          :properties="{ issueId: issue.id }"
        >
          <ol-geom-line-string :coordinates="toLineCoords(issue)" />
          <ol-style>
            <ol-style-stroke
              :color="issue.color"
              :width="isSelected(issue) ? 6 : 3"
            />
          </ol-style>
        </ol-feature>

        <ol-feature
          v-for="issue in polygons"
          :key="`polygon-${issue.id}`"
          :properties="{ issueId: issue.id }"
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

        <ol-interaction-snap v-if="modifyEnabled" />

        <!-- editor -->
        <ol-interaction-modify
          v-if="modifyEnabled"
          :features="selectedFeatures"
          @modifyend="onModifyEnd"
        >
          <ol-style>
            <ol-style-circle :radius="7">
              <ol-style-stroke :color="'white'" :width="2" />
            </ol-style-circle>
          </ol-style> </ol-interaction-modify
      ></ol-source-vector>
    </ol-vector-layer>

    <InteractionSelect :condition="click" :style @select="onFeatureSelect" />

    <ol-layerswitcherimage-control :mouseover="true" />
  </ol-map>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Issue } from "~/types/Issue";
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
import InteractionSelect from "./InteractionSelect.vue";

const { issues } = storeToRefs(useIssues());

// const vectorLayer = ref(null);
// watch(vectorLayer, (value) => {
//   if (!value) return;
//   const vectorLayer = value.vectorLayer;
//   console.log("Vector layer changed:", vectorLayer);
//   if (vectorLayer) {
//     vectorLayer.setStyle(style);
//   }
// });

const { issue: selectedIssue, selectedId } = storeToRefs(useSelectedIssue());
function isSelected(issue: Issue) {
  return issue.id === selectedId.value;
}

const { isEditing } = useIsEditing();
const modifyEnabled = computed(() => {
  return isEditing.value && selectedIssue.value;
});

const center = ref([687858.9021986299, 6846820.48790154]);
const zoom = ref(13);
const projection = ref("EPSG:3857");

function style(feature: Feature) {
  const properties = feature.getProperties();
  const issueId = properties.issueId;
  const issue = issues.value?.find((i) => i.id === issueId);
  if (!issue) return;

  if (feature.getGeometry()!.getType() === "Point") {
    return new Style({
      image: new Circle({
        radius: 7,
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
      (issue): issue is Issue => issue.geometry.type === "Point"
    ) ?? []
  );
});

const polygons = computed(() => {
  return (
    issues.value?.filter(
      (issue): issue is Issue => issue.geometry.type === "Polygon"
    ) ?? []
  );
});

const lines = computed(() => {
  return (
    issues.value?.filter(
      (issue): issue is Issue => issue.geometry.type === "LineString"
    ) ?? []
  );
});

function toPointCoords(issue: Issue) {
  if (issue.geometry.type !== "Point") return [0, 0];
  return transform(issue.geometry.coordinates, "EPSG:4326", "EPSG:3857");
}

function toLineCoords(issue: Issue) {
  if (issue.geometry.type !== "LineString") return [[0, 0]];
  return issue.geometry.coordinates.map((coord) =>
    transform(coord, "EPSG:4326", "EPSG:3857")
  );
}

function toPolygonCoords(issue: Issue) {
  if (issue.geometry.type !== "Polygon") return [[[0, 0]]];
  return issue.geometry.coordinates.map((ring) =>
    ring.map((coord) => transform(coord, "EPSG:4326", "EPSG:3857"))
  );
}

function getPolygonFillColor(issue: Issue) {
  const color = issue.color || "#000000";
  return color + "40"; // 40 is 25% opacity in hex
}

function navigateToIssue(issue: Issue) {
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
    const issueId = properties.issueId;
    if (issueId === selectedId.value) {
      selectedFeatures.value.push(feature);
      return;
    } else {
      selectedId.value = issueId;
      navigateToIssue({ id: issueId } as Issue);
    }
  } else {
    selectedFeatures.value.clear();
  }
}

watch(
  selectedFeatures,
  (newFeatures) => {
    console.log("Selected features changed:", newFeatures.getArray().length);
  },
  { deep: true }
);

function onModifyEnd(event: ModifyEvent) {
  console.log("Modify end event:", event.features);
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
  // @ts-ignore
  selectedIssue.value!.geometry = geoJSON.geometry;
}
</script>

<style>
/* Optional styles */
</style>
