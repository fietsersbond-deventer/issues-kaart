<template>
  <ol-map ref="map">
    <ol-view
      ref="view"
      :center="center"
      :zoom="zoom"
      :projection="projection"
      @change:center="centerChanged"
      @change:resolution="resolutionChanged"
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

    <ol-layerswitcherimage-control
      :mouseover="true"
      @change:visible="onLayerChange"
    />
  </ol-map>
</template>

<script setup lang="ts">
import type TileLayer from "ol/layer/Tile";
import { computed } from "vue";
import type { Issue } from "~/types/Issue";
import { register } from "ol/proj/proj4.js";
import proj4 from "proj4";
import Projection from "ol/proj/Projection";

const { issues } = useIssueApi();
const route = useRoute();

// const center = ref([6.04574203491211, 52.229059859924256]);
const center = ref([687858.9021986299, 6846820.48790154]);
const zoom = ref(13);
const projection = ref("EPSG:3857");

const layerList = ref<TileLayer[]>([]);
const lightLayer = ref(null);
const luchtfotoLayer = ref(null);
const fietskaartLayer = ref(null);

proj4.defs(
  "EPSG:28992",
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs"
);
register(proj4);
const rdProjection = new Projection({
  code: "EPSG:28992",
  extent: [-285401.92, 22598.08, 595401.92, 903401.92],
});

onMounted(() => {
  console.log("");
  // @ts-ignore
  layerList.value = [lightLayer, luchtfotoLayer, fietskaartLayer]
    .filter((layer) => layer !== null)
    .map((layer) => layer.tileLayer);
});

const selectedId = computed(
  () => parseInt(route.params.id as string) as number | null
);

const markers = computed(() => {
  return issues.value?.filter((issue) => issue.geometry.type === "Point") ?? [];
});

const polygons = computed(() => {
  return (
    issues.value?.filter((issue) => issue.geometry.type === "Polygon") ?? []
  );
});

const lines = computed(() => {
  return (
    issues.value?.filter((issue) => issue.geometry.type === "LineString") ?? []
  );
});

function navigateToIssue(issue: Issue) {
  navigateTo(`/kaart/${issue.id}`);
}

const currentCenter = ref(center.value);
const currentZoom = ref(zoom.value);
const currentResolution = ref(0);

function resolutionChanged(event) {
  currentResolution.value = event.target.getResolution();
  currentZoom.value = event.target.getZoom();
}
function centerChanged(event) {
  currentCenter.value = event.target.getCenter();
}

function onLayerChange(event) {
  const selectedLayer = event.target;
  console.log("Selected layer:", event, selectedLayer);

  // // Get all layers and update their visibility
  // layerList.value.forEach((layer) => {
  //   const layerId = layer.getProperties().id;
  //   layer.setVisible(layerId === selectedId);
  // });
}
</script>
