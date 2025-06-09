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

/** Prevent same feature to be drawn twice: test equality
 * @param {} f1 First feature to compare
 * @param {} f2 Second feature to compare
 * @return {boolean}
 * @api
 */
function equalFeatures(f1: Feature<Polygon>, f2: Feature<Polygon>) {
  return (
    getTitle(f1) === getTitle(f2) &&
    f1.geometry.coordinates[0] === f2.geometry.coordinates[0] &&
    f1.geometry.coordinates[1] === f2.geometry.coordinates[1]
  );
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
