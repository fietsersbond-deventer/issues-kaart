<template>
  <!-- renderSVG builds the SVG markup itself; value only becomes QR modules. -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="qr-code"
    role="img"
    :aria-label="`QR-code: ${value}`"
    v-html="svg"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { renderSVG } from "uqr";

const { value } = defineProps<{ value: string }>();

const svg = computed(() => renderSVG(value, { border: 1 }));
</script>

<style scoped>
.qr-code :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
</style>
