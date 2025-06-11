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
import type { BBox } from "geojson";
import {
  PhotonSearchProvider,
  NominatimSearchProvider,
  type SearchResult,
  useLocationSearch,
} from "~/composables/useLocationSearch";

const emit = defineEmits<{
  selected: [data: BBox];
}>();

function select(e: SearchEvent) {
  // The search result is now a SearchResult object with boundingBox property
  const result = e.search as SearchResult;
  const boundingBox = transformBboxToOpenLayers(result.boundingBox);
  emit("selected", boundingBox);
}

function getTitle(feature: SearchResult) {
  return searchProvider.getTitle(feature);
}

// Choose which search provider to use:
// To switch to Nominatim, uncomment the next line and comment out the Photon line
const searchProvider = new NominatimSearchProvider();
// const searchProvider = new PhotonSearchProvider(); // Current: Photon

const { search: performSearch, isSearching } =
  useLocationSearch(searchProvider);

async function search(text: string, cb: (features: SearchResult[]) => void) {
  const results = await performSearch(text);

  // Convert SearchResult objects to the format expected by ol-search-control
  const features = results.map((result: SearchResult) => ({
    ...result,
    // Add any additional properties that ol-search-control might expect
    properties: {
      name: result.name,
      type: result.type,
      extent: result.boundingBox,
    },
  }));

  cb(features);
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
