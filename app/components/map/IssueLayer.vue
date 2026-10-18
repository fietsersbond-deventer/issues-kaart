<template>
  <ol-vector-layer
    :display-in-layer-switcher="false"
    :style="style"
  >
    <ol-source-vector>
      <ol-feature
        v-for="issue in markers"
        :key="`marker-${issue.id}`"
        :properties="getFeatureProperties(issue)"
      >
        <ol-geom-point :coordinates="toPointCoords(issue)" />
      </ol-feature>

      <ol-feature
        v-for="issue in lines"
        :key="`line-${issue.id}`"
        :properties="getFeatureProperties(issue)"
      >
        <ol-geom-line-string :coordinates="toLineCoords(issue)" />
      </ol-feature>

      <ol-feature
        v-for="issue in polygons"
        :key="`polygon-${issue.id}`"
        :properties="getFeatureProperties(issue)"
      >
        <ol-geom-polygon :coordinates="toPolygonCoords(issue)" />
      </ol-feature>

      <!-- editor -->
      <ol-interaction-modify
        v-if="modifyEnabled"
        :features="selectedFeatures"
        @modifyend="emit('modifyend', $event)"
      />
    </ol-source-vector>
  </ol-vector-layer>
</template>

<script setup lang="ts">
import type { UnwrapRef } from "vue";
import type { MapIssue, NewIssue } from "~~/shared/types/Issue";
import type { Collection, Feature } from "ol";
import type { LineString, Point, Polygon } from "ol/geom";
import type { ModifyEvent } from "ol/interaction/Modify";
import type { Style } from "ol/style";
import {
  getFeatureProperties,
  toPointCoords,
  toLineCoords,
  toPolygonCoords,
} from "../../utils/issueMapGeometry";

const props = defineProps<{
  issues: (MapIssue | NewIssue)[];
  featureStyle: (feature: Feature) => Style | Style[] | undefined;
  modifyEnabled: boolean;
  selectedFeatures: UnwrapRef<Collection<Feature<Point | LineString | Polygon>>>;
}>();
const emit = defineEmits<{ modifyend: [event: ModifyEvent] }>();

function style(feature: Feature) {
  return props.featureStyle(feature);
}

const markers = computed(() => {
  return props.issues.filter(
    (issue) => issue.geometry?.type === "Point",
  );
});

const polygons = computed(() => {
  return props.issues.filter(
    (issue) => issue.geometry?.type === "Polygon",
  );
});

const lines = computed(() => {
  return props.issues.filter(
    (issue) => issue.geometry?.type === "LineString",
  );
});
</script>
