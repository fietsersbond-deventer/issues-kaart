<template>
  <MapContainer>
    <MapEditableFeatureLayer />

    <LMarker
      v-for="issue in markers"
      :key="`marker-${issue.id}`"
      :lat-lng="toLatLng(issue)"
      :color="issue.color"
      @click="navigateToIssue(issue)"
    >
      <LTooltip :sticky="true">
        <div>
          <strong>{{ issue.title }}</strong>
          <div v-if="issue.legend_name" class="text-caption">
            {{ issue.legend_name }}
          </div>
        </div>
      </LTooltip>
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
      <LTooltip :sticky="true">
        <div>
          <strong>{{ issue.title }}</strong>
          <div v-if="issue.legend_name" class="text-caption">
            {{ issue.legend_name }}
          </div>
        </div>
      </LTooltip>
    </LPolygon>

    <LPolyline
      v-for="issue in lines"
      :key="`line-${issue.id}`"
      :color="issue.color"
      :lat-lngs="toLatLng(issue)"
      @click="navigateToIssue(issue)"
    >
      <LTooltip :sticky="true">
        <div>
          <strong>{{ issue.title }}</strong>
          <div v-if="issue.legend_name" class="text-caption">
            {{ issue.legend_name }}
          </div>
        </div>
      </LTooltip>
    </LPolyline>
  </MapContainer>
</template>

<script setup lang="ts">
import { LMarker, LPolyline, LPolygon } from "@vue-leaflet/vue-leaflet";
import type { Issue } from "~/types/Issue";
import cloneDeep from "lodash-es/cloneDeep";
import { coordEach } from "@turf/meta";

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
