<template>
  <MapContainer>
    <!-- <MapEditableFeatureLayer /> -->

    <!-- <ol-vector-layer>
      <ol-source-vector>
        <MapMarker
          v-for="issue in markers"
          :key="`marker-${issue.id}`"
          :coordinates="toPointCoords(issue)"
          :color="issue.color ?? '#000000'"
          :selected="issue.id == selectedId"
          @click="navigateToIssue(issue)"
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
          :coordinates="toPolygonCoords(issue)"
          :color="issue.color ?? '#000000'"
          :selected="issue.id == selectedId"
          @click="navigateToIssue(issue)"
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
          :coordinates="toLineCoords(issue)"
          :color="issue.color ?? '#000000'"
          :selected="issue.id == selectedId"
          @click="navigateToIssue(issue)"
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
      </ol-source-vector>
    </ol-vector-layer> -->
    <!-- <ol-scale-line-control :bar="true" /> -->
  </MapContainer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Issue } from "~/types/Issue";
import MapMarker from "./map/MapMarker.vue";
import MapPolygon from "./map/MapPolygon.vue";
import MapPolyline from "./map/MapPolyline.vue";
import MapEditableFeatureLayer from "./map/EditableFeatureLayer.vue";

const { issues } = useIssueApi();
const route = useRoute();
const selectedId = computed(
  () => parseInt(route.params.id as string) as number | null
);

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

function toPointCoords(issue: Issue): [number, number] {
  return issue.geometry.coordinates as [number, number];
}

function toPolygonCoords(issue: Issue): [number, number][][] {
  return issue.geometry.coordinates as [number, number][][];
}

function toLineCoords(issue: Issue): [number, number][] {
  return issue.geometry.coordinates as [number, number][];
}
</script>
