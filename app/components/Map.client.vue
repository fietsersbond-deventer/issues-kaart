<template>
  <ol-map ref="map">
    <ol-view
      ref="view"
      :center="center"
      :zoom="zoom"
      :projection="projection"
    />

    <ol-tile-layer ref="light" title="Licht" :display-in-layer-switcher="false">
      <ol-source-stadia-maps layer="alidade_smooth" />
    </ol-tile-layer>

    <ol-tile-layer ref="luchtfoto" title="Luchtfoto" :visible="false">
      <ol-source-tile-wms
        url="https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0"
        layers="Actueel_ortho25"
        attributions="&copy; <a href='https://www.kadaster.nl'>Kadaster</a>"
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
        attributions="&copy; <a href='http://opencyclemap.org'>OpenCycleMap</a>"
      />
    </ol-tile-layer>

    <ol-vector-layer>
      <ol-source-vector>
        <ol-feature
          v-for="issue in markers"
          :key="`marker-${issue.id}`"
          :properties="{ issueId: issue.id }"
        >
          <ol-geom-point :coordinates="toPointCoords(issue)" />
          <ol-style>
            <ol-style-circle :radius="7">
              <ol-style-fill :color="issue.color || '#000000'" />
              <ol-style-stroke color="white" :width="2" />
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
            <ol-style-stroke :color="issue.color || '#000000'" :width="3" />
          </ol-style>
        </ol-feature>

        <ol-feature
          v-for="issue in polygons"
          :key="`polygon-${issue.id}`"
          :properties="{ issueId: issue.id }"
        >
          <ol-geom-polygon :coordinates="toPolygonCoords(issue)" />
          <ol-style>
            <ol-style-stroke :color="issue.color || '#000000'" :width="2" />
            <ol-style-fill :color="getPolygonFillColor(issue)" />
          </ol-style>
        </ol-feature>
      </ol-source-vector>
    </ol-vector-layer>

    <ol-interaction-select @select="onFeatureSelect">
      <ol-style>
        <ol-style-stroke color="green" :width="10" />
        <ol-style-fill color="rgba(255,255,255,0.5)" />
        <ol-style-circle :radius="7">
          <ol-style-stroke color="white" :width="2" />
        </ol-style-circle>
      </ol-style>
    </ol-interaction-select>

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
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";

const { issues } = useIssueApi();

const center = ref([687858.9021986299, 6846820.48790154]);
const zoom = ref(13);
const projection = ref("EPSG:3857");

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

function onFeatureSelect(event: SelectEvent) {
  const selectedFeatures = event.selected;
  if (selectedFeatures && selectedFeatures.length > 0) {
    const feature = selectedFeatures[0] as Feature<Geometry>;
    const properties = feature.getProperties();
    const issueId = properties.issueId;
    if (issueId && issues.value) {
      const issue = issues.value.find((i) => i.id === issueId);
      if (issue) {
        navigateToIssue(issue);
      }
    }
  }
}
</script>
