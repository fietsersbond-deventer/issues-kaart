<template>
  <MapContainer :hide-controls="hideControls">
    <MapEditableFeatureLayer />

    <MapMarker
      v-for="issue in markers"
      :key="`marker-${issue.id}`"
      :lat-lng="toLatLng(issue)"
      :color="issue.color"
      :selected="issue.id == selectedId"
      @click="handleFeatureClick(issue)"
    >
      <template #tooltip>
        <div>
          <strong>{{ issue.title }}</strong>
          <div v-if="issue.legend_name" class="text-caption">
            {{ issue.legend_name }}
          </div>
        </div>
      </template>
    </MapMarker>

    <MapPolygon
      v-for="issue in polygons"
      :key="`polygon-${issue.id}`"
      :lat-lngs="toLatLng(issue)"
      :color="issue.color"
      :selected="issue.id == selectedId"
      @click="handleFeatureClick(issue)"
    >
      <template #tooltip>
        <div>
          <strong>{{ issue.title }}</strong>
          <div v-if="issue.legend_name" class="text-caption">
            {{ issue.legend_name }}
          </div>
        </div>
      </template>
    </MapPolygon>

    <MapPolyline
      v-for="issue in lines"
      :key="`line-${issue.id}`"
      :lat-lngs="toLatLng(issue)"
      :color="issue.color"
      :selected="issue.id == selectedId"
      @click="handleFeatureClick(issue)"
    >
      <template #tooltip>
        <div>
          <strong>{{ issue.title }}</strong>
          <div v-if="issue.legend_name" class="text-caption">
            {{ issue.legend_name }}
          </div>
        </div>
      </template>
    </MapPolyline>
  </MapContainer>
</template>

<script setup lang="ts">
import type { Issue } from "~/types/Issue";
import cloneDeep from "lodash-es/cloneDeep";
import { coordEach } from "@turf/meta";
import MapMarker from "./map/MapMarker.vue";
import MapPolygon from "./map/MapPolygon.vue";
import MapPolyline from "./map/MapPolyline.vue";

const { issues } = useIssueApi();
const route = useRoute();
const selectedId = computed(
  () => parseInt(route.params.id as string) as number | null
);

watch(selectedId, (newId) => {
  console.log("Selected ID changed:", newId);
});

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

const emit = defineEmits(["feature-clicked"]);

function handleFeatureClick(issue: Issue) {
  emit("feature-clicked");
  navigateToIssue(issue);
}
</script>
