<template>
  <div ref="container">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';

interface Size {
  width: number;
  height: number;
}

const size = defineModel<Size>({
  required: true,
});

const container = ref<HTMLElement | null>(null);

const updateSize = useDebounceFn(() => {
  if (!container.value) return;
  const { width, height } = container.value.getBoundingClientRect();
  size.value = {
    width: Math.round(width),
    height: Math.round(height),
  };
}, 100); // 100ms debounce

// Update size when mounted
onMounted(updateSize);

// Watch for changes in the container's children
const observer = new ResizeObserver(() => {
  updateSize();
});

onMounted(() => {
  if (container.value) {
    observer.observe(container.value);
  }
});

onUnmounted(() => {
  observer.disconnect();
});
</script>
