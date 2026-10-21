<template>
  <ol-vector-layer :display-in-layer-switcher="false" :style="style">
    <ol-source-vector ref="issueSource">
      <ol-interaction-modify
        v-if="modifyEnabled"
        :features="selectedFeatures"
        @modifyend="emit('modifyend', $event)"
      />
    </ol-source-vector>
  </ol-vector-layer>
</template>

<script setup lang="ts">
import { computed, watch, useTemplateRef } from "vue";
import type VectorSource from "ol/source/Vector";
import type { UnwrapRef } from "vue";
import type { MapIssue, NewIssue } from "~~/shared/types/Issue";
import type { Collection, Feature } from "ol";
import type { LineString, Point, Polygon } from "ol/geom";
import type { ModifyEvent } from "ol/interaction/Modify";
import type { Style } from "ol/style";
import { createIssueFeatureSync } from "../../utils/syncIssueFeatures";

const props = defineProps<{
  issues: (MapIssue | NewIssue)[];
  featureStyle: (feature: Feature) => Style | Style[] | undefined;
  modifyEnabled: boolean;
  selectedId?: number | null;
  selectedFeatures: UnwrapRef<Collection<Feature<Point | LineString | Polygon>>>;
}>();
const issueSource = useTemplateRef<{ source: VectorSource<Feature<Point | LineString | Polygon>> }>("issueSource");
const source = computed(() => issueSource.value?.source);
defineExpose({ source });
const emit = defineEmits<{ modifyend: [event: ModifyEvent] }>();
function style(feature: Feature) { return props.featureStyle(feature); }
watch(source, (current, _, onCleanup) => {
  if (!current) return;
  const sync = createIssueFeatureSync(current);
  // Collection changes are shallow: selected edits and websocket updates replace records.
  const stop = watch(() => props.issues, sync, { immediate: true });
  onCleanup(stop);
}, { immediate: true });
watch(() => props.selectedId, () => source.value?.changed());
</script>
