<template>
  <ol-search-control
    placeholder="Zoek"
    :get-title="getTitle"
    :autocomplete="search"
    :class="{ 'is-searching': isSearching }"
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
  return {
    name: feature.properties?.name || "",
    type: feature.properties?.type || "",
    city: feature.properties?.city || "",
  };
}

let currentController: AbortController | null = null;
const isSearching = ref(false);

async function search(
  text: string,
  cb: (features: Feature<Polygon>[]) => void
) {
  // Abort previous request if it exists
  if (currentController) {
    currentController.abort();
  }

  isSearching.value = true;
  // Create new controller for this request
  currentController = new AbortController();

  try {
    const features: Feature<Polygon>[] = await fetch(
      `https://photon.komoot.io/api/?lat=52.2511467&lon=6.1574997&q=${encodeURIComponent(
        text
      )}`,
      { signal: currentController.signal }
    ).then((response) =>
      response.json().then((data) => {
        return data.features.filter((f) => !!f.properties.extent);
      })
    );

    // unique features
    const results: Map<string, Feature<Polygon>> = new Map();
    features.forEach((f: Feature<Polygon>) => {
      const key = getUniqueKey(f);
      results.set(JSON.stringify(key), f);
    });

    console.debug("keys", results.keys());

    cb(Array.from(results.values()));
  } catch (error: unknown) {
    // If the error is due to abort, we don't need to do anything
    if (error instanceof Error && error.name === "AbortError") return;
    // Otherwise pass an empty array to callback
    cb([]);
  } finally {
    isSearching.value = false;
  }
}
</script>

<style>
.ol-search {
  top: 0.5em !important;
  left: 3em !important;
}

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

.ol-search.is-searching input {
  padding-right: 2em;
}

.ol-search.is-searching::after {
  content: "";
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: 2px solid #666;
  border-top-color: transparent;
  border-radius: 50%;
  animation: search-spin 1s linear infinite;
  opacity: 0.7;
  pointer-events: none;
}

@keyframes search-spin {
  from {
    transform: translateY(-50%) rotate(0deg);
  }
  to {
    transform: translateY(-50%) rotate(360deg);
  }
}
</style>
