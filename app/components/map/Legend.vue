<template>
  <div class="legend-container">
    <v-list density="compact" class="legend-list pa-0">
      <v-list-item
        v-for="item in visibleLegends"
        :key="item.id"
        class="legend-item"
        density="compact"
      >
        <template #prepend>
          <!-- Show generated canvas icon if available -->
          <img
            v-if="item.icon && item.icon_data_url"
            :src="item.icon_data_url"
            :alt="item.icon"
            class="legend-icon-image"
          />
          <!-- Fallback to v-icon -->
          <v-icon
            v-else-if="item.icon"
            :icon="item.icon"
            :color="item.color"
            size="small"
          />
          <!-- Color rectangle fallback -->
          <div
            v-else
            class="color-preview"
            :style="{ backgroundColor: item.color }"
          />
        </template>
        <v-list-item-title class="text-body-2 text-truncate">{{
          item.name
        }}</v-list-item-title>
        <template v-if="item.description" #append>
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
        </template>
      </v-list-item>
    </v-list>
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
