<template>
  <ol-overlay v-if="area" :position="area.position" :offset="[0,-5]" positioning="bottom-center">
    <div class="tooltip">{{ area.name }}</div>
  </ol-overlay>
</template>

<script setup lang="ts">
import type OlMap from "ol/Map";
import type { MapBrowserEvent } from "ol";

const map: OlMap | undefined = inject("map");

const area = ref<{ name: string; position: number[] } | null>(null);

function onPointerMove(evt: MapBrowserEvent) {
  const hits = (
    map?.getFeaturesAtPixel(evt.pixel, { hitTolerance: 3 }) ?? []
  ).filter((f) => !f.get("current"));
  // Issues take precedence over the area underneath them
  const hit = hits.some((f) => !f.get("areaUrl"))
    ? undefined
    : hits.find((f) => f.get("areaUrl"));
  area.value = hit ? { name: hit.get("name"), position: evt.coordinate } : null;
  // The viewport cursor is separate from the target cursor set by MapTooltip
  map?.getViewport()?.style?.setProperty("cursor", hit ? "pointer" : "");
}

onMounted(() => map?.on("pointermove", onPointerMove));
onUnmounted(() => {
  map?.un("pointermove", onPointerMove);
  map?.getViewport()?.style?.removeProperty("cursor");
});
</script>
