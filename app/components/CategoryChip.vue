<template>
  <v-chip
    label
    variant="flat"
    size="small"
    :color="legend.color"
    :style="{ color: getContrastColor(legend.color) }"
    :aria-pressed="active"
    @click.stop.prevent="categoryFilters.toggleCategoryVisibility(legend.id)"
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
    <template v-if="active || legend.icon" #prepend>
      <v-icon
        v-if="active"
        icon="mdi-check"
        size="16"
        class="mr-1 d-print-none"
      />
      <AppIcon v-if="legend.icon" :icon="legend.icon" size="16" class="mr-2" />
    </template>
  </v-chip>
</template>

<script lang="ts" setup>
import type { Legend } from "~~/shared/types/Legend";

const { legend } = defineProps<{ legend: Legend }>();

// Active when this category is explicitly selected in the ?cat= filter.
const categoryFilters = useCategoryFilters();
const { isShowingAllCategories } = storeToRefs(categoryFilters);
const active = computed(
  () =>
    !isShowingAllCategories.value &&
    categoryFilters.isCategoryVisible(legend.id),
);
</script>

<style></style>
