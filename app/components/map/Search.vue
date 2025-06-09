<template>
  <ol-search-control
    placeholder="Zoek"
    :get-title="getTitle"
    :autocomplete="search"
    ,
    @select="select"
  />
</template>

<script lang="ts" setup>
import type { SearchEvent } from "ol-ext";
import { transformBboxToOpenLayers } from "~/utils/getIssuesBbox";
import type { BBox, Feature, Polygon } from "geojson";

const emit = defineEmits<{
  selected: [data: BBox];
}>();

function select(e: SearchEvent) {
  // swap coordinates to match OpenLayers format
  const [west, north, east, south] = e.search.properties.extent;
  const boundingBox = transformBboxToOpenLayers([west, south, east, north]);
  emit("selected", boundingBox);
}

function getTitle(feature: Feature) {
  if (!feature.properties) return "";
  const p = feature.properties!;
  return `${p.name} ${p.street || ""} ${p.housenumber || ""} 
    <i>
    ${p.type == "street" ? `${p.postcode || ""} ${p.city || ""}` : p.type}
</i>
`;
}

function getUniqueKey(feature: Feature<Polygon>) {
  return feature.geometry;
}

let currentController: AbortController | null = null;

async function search(text: string, cb) {
  // Abort previous request if it exists
  if (currentController) {
    currentController.abort();
  }

  // Create new controller for this request
  currentController = new AbortController();

  try {
    const features = await fetch(
      `https://photon.komoot.io/api/?lat=52.2511467&lon=6.1574997&q=${encodeURIComponent(
        text
      )}`,
      { signal: currentController.signal }
    ).then((response) =>
      response.json().then((data) => {
        return data.features;
      })
    );

    // unique features based on geometry
    const results: Map<string, Feature<Polygon>> = new Map(
      features.map((f: Feature<Polygon>) => {
        const key = getUniqueKey(f);
        return [key, f];
      })
    );

    cb(Array.from(results.values()));
  } catch (error: unknown) {
    // If the error is due to abort, we don't need to do anything
    if (error instanceof Error && error.name === "AbortError") return;
    // Otherwise pass an empty array to callback
    cb([]);
  }
}
</script>

<style>
.ol-search ul {
  color: #333;
  font-size: 0.85em;
  max-width: 21em;
}
.ol-search ul i {
  display: block;
  color: #333;
  font-size: 0.85em;
}
</style>
