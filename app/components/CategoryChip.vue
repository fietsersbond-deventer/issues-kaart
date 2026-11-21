<template>
  <v-chip
    label
    variant="flat"
    size="small"
    :color="legend.color"
    :style="{ color: getContrastColor(legend.color) }"
    >{{ legend.name }}
    <v-tooltip
      v-if="legend.description"
      location="top"
      activator="parent"
      max-width="40em"
    >
      <template #default>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="tooltip-content" v-html="legend.description"></div>
      </template>
    </v-tooltip>
    <template v-if="legend.icon" #prepend>
      <AppIcon :icon="legend.icon" size="16" class="mr-2" />
    </template>
  </v-chip>
</template>

<script lang="ts" setup>
import type { Legend } from "~~/shared/types/Legend";

const { legend } = defineProps<{ legend: Legend }>();
</script>

<style></style>
