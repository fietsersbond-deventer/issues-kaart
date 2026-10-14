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
    <ol-vector-layer
      :display-in-layer-switcher="false"
      :z-index="1"
      class-name="area-layer"
      :style="currentStyle"
    >
      <ol-source-vector :features="currentFeatures" />
    </ol-vector-layer>
    <MapAreaTooltip />
  </div>
</template>

<script setup lang="ts">
import type OlMap from "ol/Map";
import { Feature, type MapBrowserEvent } from "ol";
import { MultiPolygon, Polygon } from "ol/geom";
import type { FeatureLike } from "ol/Feature";
import { GeoJSON } from "ol/format";
import { Fill, Stroke, Style } from "ol/style";
import gebieden from "~/assets/gebieden.geojson?raw";

const map: OlMap | undefined = inject("map");

const { hostname: currentHost } = useCurrentArea();

const allFeatures = new GeoJSON().readFeatures(JSON.parse(gebieden), {
  dataProjection: "EPSG:4326",
  featureProjection: "EPSG:3857",
});
const isCurrent = (f: FeatureLike) =>
  new URL(f.get("areaUrl")).hostname === currentHost;
const features = allFeatures.filter((f) => !isCurrent(f));

function signedArea(ring: number[][]) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i]![0]! * ring[i + 1]![1]! - ring[i + 1]![0]! * ring[i]![1]!;
  }
  return sum / 2;
}

// Mask: a world-covering polygon with the current area cut out as hole(s).
// Flagged so hover/click handlers ignore it.
function createMask(): Feature[] {
  const holes: number[][][] = [];
  for (const f of allFeatures.filter(isCurrent)) {
    const geometry = f.getGeometry();
    const polygons =
      geometry instanceof MultiPolygon
        ? geometry.getPolygons()
        : geometry instanceof Polygon
          ? [geometry]
          : [];
    for (const polygon of polygons) holes.push(polygon.getCoordinates()[0]!);
  }
  if (!holes.length) return [];
  const [w, s, e, n] = [-20037508, -20048966, 20037508, 20048966];
  const world = [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
  // Holes must wind opposite to the outer ring
  const oriented = holes.map((h) =>
    signedArea(h) * signedArea(world) > 0 ? [...h].reverse() : h,
  );
  const mask = new Feature(new Polygon([world, ...oriented]));
  mask.set("current", true);
  return [mask];
}
const currentFeatures = createMask();

const currentStyle = new Style({
  stroke: new Stroke({ color: "rgba(37, 99, 235, 0.5)", width: 1 }),
  fill: new Fill({ color: "rgba(15, 23, 42, 0.2)" }),
});

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
  const hits = (
    map?.getFeaturesAtPixel(evt.pixel, { hitTolerance: 3 }) ?? []
  ).filter((f) => !f.get("current"));
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
