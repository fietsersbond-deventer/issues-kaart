<template>
  <div
    ref="controlRef"
    :class="['ol-positioning', 'ol-unselectable', position]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { Control } from "ol/control";
import type { Map } from "ol";

const { position = "top-left" } = defineProps<{
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}>();

const controlRef = useTemplateRef<HTMLDivElement>("controlRef");
let control: Control;

const map = inject<Map>("map");

onMounted(async () => {
  if (!controlRef.value) return;

  // Create and add control using the template ref element
  control = new Control({ element: controlRef.value });
  map?.addControl(control);
});

onBeforeUnmount(() => {
  if (control) {
    map?.removeControl(control);
  }
});

defineExpose({
  control: () => control,
});
</script>

<style>
.ol-positioning {
  position: absolute;
  background-color: transparent;
  pointer-events: auto;
  padding: 0;
}

.ol-positioning.top-left {
  top: 0.5em;
  left: 0.5em;
}

.ol-positioning.top-right {
  top: 0.5em;
  right: 0.5em;
}

.ol-positioning.bottom-left {
  bottom: 0.5em;
  left: 0.5em;
}

.ol-control.bottom-right {
  bottom: 0.5em;
  right: 0.5em;
}
</style>
