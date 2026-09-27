<template>
  <v-chip
    :style="{ marginLeft: '12px' }"
    label
    variant="flat"
    size="small"
    :color="legend.color"
    :text-color="getContrastColor(legend.color)"
    >{{ legend.name }}</v-chip
  >
</template>

<script lang="ts" setup>
import type { Legend } from "~/types/Legend";

const { legend } = defineProps<{ legend: Legend }>();
</script>

<style></style>
