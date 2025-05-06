<template>
  <MapBase
    v-model:zoom="zoom"
    v-model:center="center"
    v-model:bounds="bounds"
    :url
    :attribution
  >
    <MapEditableFeatureLayer />

    <LMarker
      v-for="issue in markers"
      :key="`marker-${issue.id}`"
      :lat-lng="toLatLng(issue)"
      :color="issue.color"
      @click="navigateToIssue(issue)"
    >
      <LTooltip :content="issue.title" :sticky="true" />
      <LIcon
        :options="{ iconSize: [40, 40], iconAnchor: [20, 40] }"
        class="marker-icon"
      >
        <VIcon
          icon="mdi-map-marker"
          :size="40"
          :color="issue.color"
          class="text-2xl"
        /> </LIcon
    ></LMarker>

    <LPolygon
      v-for="issue in polygons"
      :key="`polygon-${issue.id}`"
      :color="issue.color"
      :lat-lngs="toLatLng(issue)"
      @click="navigateToIssue(issue)"
    >
      <LTooltip :content="issue.title" :sticky="true" />
    </LPolygon>

    <LPolyline
      v-for="issue in lines"
      :key="`line-${issue.id}`"
      :color="issue.color"
      :lat-lngs="toLatLng(issue)"
      @click="navigateToIssue(issue)"
    >
      <LTooltip :content="issue.title" :sticky="true" />
    </LPolyline>

    /></MapBase
  >
</template>

<script setup lang="ts">
import { LMarker, LPolyline, LPolygon } from "@vue-leaflet/vue-leaflet";
import type { Issue } from "~/types/Issue";
import cloneDeep from "lodash-es/cloneDeep";
import { coordEach } from "@turf/meta";

const bounds = ref<[[number, number], [number, number]]>([
  [52.229059859924256, 6.04574203491211],
  [52.30207457819167, 6.30941390991211],
]);

const apikey = useRuntimeConfig().public.apikey;
const url = `https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${apikey}`;
const mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
const ocmlink = '<a href="http://thunderforest.com/">Thunderforest</a>';
const attribution = `&copy; ${mapLink} contributors, &copy; contributers ${ocmlink}`;

const center = ref<[number, number]>([
  (bounds.value[0][0] + bounds.value[1][0]) / 2,
  (bounds.value[0][1] + bounds.value[1][1]) / 2,
]);

const zoom = ref(8);

const { issues } = useIssueApi();

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

function toLatLng(issue: Issue) {
  const geometry = cloneDeep(issue.geometry);
  coordEach(geometry, (coord) => {
    const [lat, lng] = coord;
    coord[0] = lng!;
    coord[1] = lat!;
  });
  return geometry.coordinates;
}
</script>

<style>
.leaflet-marker-icon {
  background-color: transparent;
  border: none;
}
</style>
