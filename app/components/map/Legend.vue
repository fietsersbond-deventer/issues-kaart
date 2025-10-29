<template>
  <div class="legend-container">
    <v-table class="legend-list pa-0">
      <tr
        v-for="item in visibleLegends"
        :key="item.id"
        class="legend-item"
        density="compact"
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
