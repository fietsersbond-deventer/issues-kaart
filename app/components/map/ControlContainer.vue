<template>
  <div
    ref="controlRef"
    :class="[
      'ol-positioning',
      'ol-unselectable',
      'control-container',
      position,
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { Control } from "ol/control";
import type { Map } from "ol";

defineProps<{
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
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

<style scoped>
.control-container {
  position: absolute;
  background-color: transparent;
  display: flex;
  gap: 0.5em;
  pointer-events: none;
}

/* Positioning */
.control-container.top-left {
  top: 0.5em;
  left: 0.5em;
}

.control-container.top-right {
  top: 0.5em;
  right: 0.5em;
}

.control-container.bottom-left {
  bottom: 0.5em;
  left: 0.5em;
}

.control-container.bottom-right {
  bottom: 0.5em;
  right: 0.5em;
}

/* Top-left and top-right stack vertically */
.control-container.top-left,
.control-container.top-right {
  flex-direction: column;
  align-items: flex-start;
}

.control-container.top-right {
  align-items: flex-end;
}

/* Bottom-left and bottom-right stack vertically upward */
.control-container.bottom-left,
.control-container.bottom-right {
  flex-direction: column;
  align-items: flex-start;
}

.control-container.bottom-right {
  align-items: flex-end;
}

/* Children get pointer events back */
.control-container :deep(> *) {
  pointer-events: auto;
}
</style>
