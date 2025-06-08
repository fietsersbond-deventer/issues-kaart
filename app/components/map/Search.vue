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
import type { BBox, Feature } from "geojson";

const emit = defineEmits<{
  selected: [data: BBox];
}>();

function select(e: SearchEvent) {
  const boundingBox = transformBboxToOpenLayers(e.search.properties.extent);
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

async function search(text: string, cb) {
  const results = await fetch(
    `https://photon.komoot.io/api/?lat=52.2511467&lon=6.1574997&q=${encodeURIComponent(
      text
    )}`
  ).then((response) =>
    response.json().then((data) => {
      return data.features;
    })
  );
  cb(results);
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
