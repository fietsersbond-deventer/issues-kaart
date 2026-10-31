<template>
  <v-chip
    label
    variant="flat"
    size="small"
    :color="legend.color"
    :text-color="getContrastColor(legend.color)"
    >{{ legend.name }}
    <v-tooltip v-if="legend.description" location="top" activator="parent">
      {{ legend.description }}
    </v-tooltip>
  </v-chip>
</template>

<script lang="ts" setup>
import type { Legend } from "~~/shared/types/Legend";

const { legend } = defineProps<{ legend: Legend }>();
</script>

<style></style>
