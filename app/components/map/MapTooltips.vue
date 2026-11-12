<template>
  <div>
    <ol-overlay v-if="feature && !isInteracting" :position="position" positioning="bottom-center">
      <MapClusterTooltip v-if="members && members.length > 1" :members="members" />
      <MapTooltip v-else :feature="members?.[0] ?? feature" />
    </ol-overlay>
  </div>
</template>

<script setup lang="ts">
import type { Feature } from "ol";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type OlMap from "ol/Map";
import MapTooltip from "./MapTooltip.vue";
import MapClusterTooltip from "./MapClusterTooltip.vue";

const { isDrawing } = defineProps<{ isDrawing: boolean }>();
const map: OlMap | undefined = inject("map");
const { isEditing } = useIsEditing();
const isInteracting = computed(() => isDrawing || isEditing.value);
const feature = shallowRef<Feature | null>(null);
const members = computed<Feature[] | undefined>(() => feature.value?.getProperties().features);
const position = ref<number[]>([0, 0]);

function clearTooltip() {
  feature.value = null;
  const target = map?.getTargetElement();
  if (target) target.style.cursor = "";
}

watch(isInteracting, active => {
  if (active) clearTooltip();
});

function onPointerMove(event: MapBrowserEvent) {
  if (!map || isInteracting.value) {
    clearTooltip();
    return;
  }
  const pixel = event.pixel;
  const hit = map.getFeaturesAtPixel(pixel, {
    hitTolerance: 3,
    layerFilter: layer => layer.getClassName() !== "area-layer",
  })?.[0];
  if (!hit) {
    clearTooltip();
    return;
  }
  feature.value = hit as Feature;
  const target = map.getTargetElement();
  if (target) target.style.cursor = "pointer";
  if (typeof pixel[0] === "number" && typeof pixel[1] === "number") {
    position.value = map.getCoordinateFromPixel([pixel[0], pixel[1] - 15]);
  }
}

onMounted(() => map?.on("pointermove", onPointerMove));
onUnmounted(() => map?.un("pointermove", onPointerMove));
</script>
