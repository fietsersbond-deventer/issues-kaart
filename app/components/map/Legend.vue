<template>
  <div class="legend-container">
    <v-table class="legend-list pa-2">
      <tr
        v-for="item in usedCategories"
        :key="item.id"
        class="legend-item clickable"
        :class="{ 'legend-item--disabled': !isCategoryVisible(item.id) }"
        density="compact"
        tabindex="0"
        role="checkbox"
        :aria-checked="isCategoryVisible(item.id)"
        @click="toggleCategoryVisibility(item.id)"
        @keydown.enter.prevent="toggleCategoryVisibility(item.id)"
        @keydown.space.prevent="toggleCategoryVisibility(item.id)"
      >
        <td>
          <LegendIndicator :legend="item" :size="24" />
        </td>
        <td class="text-body-2 text-truncate pa-2">{{ item.name }}</td>
        <td>
          <v-tooltip
            v-if="item.description"
            :text="item.description"
            location="top"
          >
            <template #activator="{ props }">
              <v-icon
                v-bind="props"
                icon="mdi-information"
                size="x-small"
                color="grey"
              />
            </template>
          </v-tooltip>
        </td>
        <td class="ps-2 font-weight-thin">
          {{ countIssues[item.id] }}
        </td>
      </tr>
    </v-table>
  </div>
</template>

<script setup lang="ts">
const { toggleCategoryVisibility, isCategoryVisible } = useCategoryFilters();
const { usedCategories } = storeToRefs(useCategoryFilters());
const { issues } = storeToRefs(useIssues());

const countIssues = computed(() => {
  const counts: Record<number, number> = {};
  issues.value.forEach((issue) => {
    counts[issue.legend_id] = (counts[issue.legend_id] ?? 0) + 1;
  });

  return counts;
});
</script>

<style scoped>
.legend-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden; /* Contain the overflow */
}

.legend-list {
  overflow-y: auto !important;
  max-height: 100% !important;
  padding: 0;
}

.legend-item {
  min-height: 28px !important;
  height: 28px !important;
  padding: 0 8px !important;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
}

.legend-item.clickable {
  cursor: pointer;
}

.legend-item.clickable:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.legend-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.legend-item--disabled {
  opacity: 0.4;
}

.legend-item--disabled:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-icon-image {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
