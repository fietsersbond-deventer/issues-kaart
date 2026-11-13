<template>
  <div class="search-preview-map">
    <ol-map ref="mapRef" class="search-preview-ol-map" :controls="[]">
      <ol-view :center="center" :zoom="15" projection="EPSG:3857" />
      <ol-tile-layer>
        <ol-source-wmts
          url="https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0?TILEMATRIXSET=EPSG:28992"
          layer="standaard"
          :projection="rdProjection"
          attributions='&copy; <a href="https://www.kadaster.nl">Kadaster</a>'
          format="image/png"
          style="default"
        />
      </ol-tile-layer>
      <ol-vector-layer :style="previewStyle">
        <ol-source-vector :features="features" />
      </ol-vector-layer>
    </ol-map>
  </div>
</template>

<script setup lang="ts">
import type { Geometry } from "geojson";
import type OlMap from "ol/Map";
import { Feature } from "ol";
import GeoJSONFormat from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { register } from "ol/proj/proj4.js";
import Projection from "ol/proj/Projection";
import proj4 from "proj4";
import { Circle, Fill, Stroke, Style } from "ol/style";

// Zelfde RD-projectie als de hoofdkaart (zie app/components/map/BaseLayers.vue) voor de PDOK-achtergrondkaart.
proj4.defs(
  "EPSG:28992",
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs",
);
register(proj4);
const rdProjection = new Projection({
  code: "EPSG:28992",
  extent: [-285401.92, 22598.08, 595401.92, 903401.92],
});

const props = defineProps<{
  lat: number;
  lon: number;
  boundingbox?: { south: number; west: number; north: number; east: number };
  geometry?: Geometry;
}>();

const geoJsonFormat = new GeoJSONFormat({
  dataProjection: "EPSG:4326",
  featureProjection: "EPSG:3857",
});

const center = computed(() => fromLonLat([props.lon, props.lat]));

const hasAreaGeometry = computed(() => {
  const type = props.geometry?.type;
  return (
    type === "Polygon" ||
    type === "LineString" ||
    type === "MultiPolygon" ||
    type === "MultiLineString"
  );
});

// Zonder echte geometrie (bv. Photon, dat alleen punt + bbox levert) toch het
// gebied laten zien via een rechthoek, mits de bbox niet verwaarloosbaar klein is.
const MIN_BBOX_SPAN = 0.0005; // graden, ruwweg 50 meter
const hasUsableBbox = computed(() => {
  const b = props.boundingbox;
  return (
    !!b &&
    Math.abs(b.east - b.west) > MIN_BBOX_SPAN &&
    Math.abs(b.north - b.south) > MIN_BBOX_SPAN
  );
});

const isArea = computed(() => hasAreaGeometry.value || hasUsableBbox.value);

const features = computed(() => {
  if (hasAreaGeometry.value) {
    return geoJsonFormat.readFeatures({
      type: "Feature",
      properties: {},
      geometry: props.geometry as Geometry,
    });
  }
  if (hasUsableBbox.value) {
    const { west, south, east, north } = props.boundingbox!;
    return geoJsonFormat.readFeatures({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    });
  }
  return [new Feature({ geometry: new Point(center.value) })];
});

const previewStyle = new Style({
  image: new Circle({
    radius: 8,
    fill: new Fill({ color: "#2196F3" }),
    stroke: new Stroke({ color: "#fff", width: 2 }),
  }),
  stroke: new Stroke({ color: "#2196F3", width: 3 }),
  fill: new Fill({ color: "rgba(33, 150, 243, 0.15)" }),
});

const mapRef = useTemplateRef<{ map?: OlMap }>("mapRef");

function fitToTarget() {
  const map = mapRef.value?.map;
  const view = map?.getView();
  if (!map || !view) return;

  // De kaart is net gemount in een nieuw, vast formaat; zonder dit blijft OL uitgaan van maat 0.
  map.updateSize();

  if (isArea.value) {
    const extent = features.value[0]?.getGeometry()?.getExtent();
    if (extent) view.fit(extent, { padding: [20, 20, 20, 20], maxZoom: 15 });
  } else {
    view.setCenter(center.value);
    view.setZoom(14);
  }
}

onMounted(() => nextTick(fitToTarget));
watch(
  () => [props.lat, props.lon, props.geometry, props.boundingbox],
  () => nextTick(fitToTarget),
);
</script>

<style scoped>
.search-preview-map {
  width: 300px;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.search-preview-ol-map {
  width: 100%;
  height: 100%;
}
</style>
