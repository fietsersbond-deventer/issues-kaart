<template>
  <div class="legend-container">
    <v-table class="legend-list pa-2">
      <tr
        v-for="item in visibleLegends"
        :key="item.id"
        class="legend-item clickable"
        :class="{ 'legend-item--disabled': !isLegendVisible(item.id) }"
        density="compact"
        @click="toggleLegendVisibility(item.id)"
      >
        <td>
          <LegendIndicator :legend="item" :size="24" />
        </td>
        <td class="text-body-2 text-truncate pa-2">{{ item.name }}</td>
        <td v-if="item.description">
          <v-tooltip :text="item.description" location="top">
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
      </tr>
    </v-table>
  </div>
</template>

<script setup lang="ts">
const { legends } = storeToRefs(useLegends());
const { toggleLegendVisibility, isLegendVisible } = useLegendFilters();

// Only need legend_id to determine which legends are visible
const { issues } = storeToRefs(useIssues({ fields: "id,legend_id" }));

// Only show legends that are actually used in the map
const visibleLegends = computed(() => {
  const usedLegendIds = new Set(
    issues.value
      ?.map((issue) => issue.legend_id)
      .filter((id): id is number => id != null) || []
  );
  return legends.value?.filter((legend) => usedLegendIds.has(legend.id)) ?? [];
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
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.legend-item.clickable {
  cursor: pointer;
}

.legend-item.clickable:hover {
  background-color: rgba(0, 0, 0, 0.04);
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
