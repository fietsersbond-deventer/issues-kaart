<template>
  <div>
    <ol-vector-layer
      :display-in-layer-switcher="false"
      :z-index="1"
      class-name="area-layer"
      :style="areaStyle"
    >
      <ol-source-vector :features="features" />
    </ol-vector-layer>
    <MapAreaTooltip />
  </div>
</template>

<script setup lang="ts">
import type OlMap from "ol/Map";
import type { MapBrowserEvent } from "ol";
import type { FeatureLike } from "ol/Feature";
import { GeoJSON } from "ol/format";
import { Fill, Stroke, Style } from "ol/style";
import gebieden from "~/assets/gebieden.geojson?raw";

const map: OlMap | undefined = inject("map");

// localhost is treated as the Deventer instance
const currentHost = import.meta.client
  ? location.hostname === "localhost"
    ? "deventer.kaart.fietsersbond.nl"
    : location.hostname
  : "";

const features = new GeoJSON()
  .readFeatures(JSON.parse(gebieden), {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  })
  .filter((f) => new URL(f.get("areaUrl")).hostname !== currentHost);

const normalStyle = new Style({
  stroke: new Stroke({ color: "#2563eb", width: 2, lineDash: [8, 6] }),
  fill: new Fill({ color: "rgba(37, 99, 235, 0.12)" }),
});
const hoverStyle = new Style({
  stroke: new Stroke({ color: "#1d4ed8", width: 3 }),
  fill: new Fill({ color: "rgba(37, 99, 235, 0.3)" }),
});

function areaStyle(feature: FeatureLike) {
  return feature.get("hover") ? hoverStyle : normalStyle;
}

function onPointerMove(evt: MapBrowserEvent) {
  const url = areaUrlAt(evt);
  for (const f of features) f.set("hover", f.get("areaUrl") === url);
}

function areaUrlAt(evt: MapBrowserEvent): string | undefined {
  const hits = map?.getFeaturesAtPixel(evt.pixel, { hitTolerance: 3 }) ?? [];
  // Issues take precedence over the area underneath them
  if (hits.some((f) => !f.get("areaUrl"))) return undefined;
  return hits.find((f) => f.get("areaUrl"))?.get("areaUrl");
}

function onClick(evt: MapBrowserEvent) {
  const url = areaUrlAt(evt);
  if (url) location.href = url;
}

onMounted(() => {
  map?.on("singleclick", onClick);
  map?.on("pointermove", onPointerMove);
});
onUnmounted(() => {
  map?.un("singleclick", onClick);
  map?.un("pointermove", onPointerMove);
});
</script>
