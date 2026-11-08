<template>
  <ol-vector-layer
    :display-in-layer-switcher="false"
    :style="style"
  >
    <ol-source-vector ref="issueSource">
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

  <ol-vector-layer
    v-for="group in clusterGroups"
    :key="group.categoryId"
    :display-in-layer-switcher="false"
    :style="clusterStyle"
  >
    <ol-source-cluster>
      <ol-source-vector>
        <ol-feature
          v-for="issue in group.issues"
          :key="`cluster-marker-${issue.id}`"
          :properties="getFeatureProperties(issue)"
        >
          <ol-geom-point :coordinates="toPointCoords(issue)" />
        </ol-feature>
      </ol-source-vector>
    </ol-source-cluster>
  </ol-vector-layer>
</template>

<script setup lang="ts">
import type VectorSource from "ol/source/Vector";
import { watch } from "vue";
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
  clusterEnabled?: boolean;
  zoom?: number;
  editing?: boolean;
}>();
const issueSource = useTemplateRef<{ source: VectorSource<Feature<Point | LineString | Polygon>> }>("issueSource");
const source = computed(() => issueSource.value?.source);
defineExpose({ source });
// Keep the actual features visible when editing or when zoomed in far enough.
const clustering = computed(() => Boolean(props.clusterEnabled && (props.zoom ?? 0) < 18 && !props.editing));
watch(clustering, () => source.value?.changed());

const emit = defineEmits<{ modifyend: [event: ModifyEvent] }>();

function style(feature: Feature) {
  // The cluster layers render points while the original layer still renders
  // lines and polygons and remains the source for Modify.
  if (clustering.value && feature.getGeometry()?.getType() === "Point") return;
  return props.featureStyle(feature);
}

function clusterStyle(feature: Feature) {
  return props.featureStyle(feature);
}

const markers = computed(() => {
  return props.issues.filter(
    (issue) => issue.geometry?.type === "Point",
  );
});

// A cluster source groups by distance only, so each category needs its own
// source. Vue keeps these marker copies in step with the filtered issue data.
const clusterGroups = computed(() => {
  if (!clustering.value) return [];
  const groups = new Map<number | null, (MapIssue | NewIssue)[]>();
  for (const issue of markers.value) {
    const categoryId = issue.legend_id ?? null;
    const issues = groups.get(categoryId) ?? [];
    issues.push(issue);
    groups.set(categoryId, issues);
  }
  return Array.from(groups, ([categoryId, issues]) => ({ categoryId: categoryId ?? "none", issues }));
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
