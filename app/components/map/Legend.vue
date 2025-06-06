<template>
  <div class="legend-container">
    <v-list density="compact" class="legend-list pa-0">
      <v-list-subheader class="py-1 text-caption">Legenda</v-list-subheader>
      <v-list-item
        v-for="item in visibleLegends"
        :key="item.id"
        class="legend-item"
        density="compact"
      >
        <template #prepend>
          <div class="color-preview" :style="{ backgroundColor: item.color }" />
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
import type { Legend } from "~~/server/database/schema";
const { getAll: getLegends } = useLegendApi();
const { issues } = storeToRefs(useIssues());

const legends = ref<Legend[]>([]);

// Only show legends that are actually used in the map
const visibleLegends = computed(() => {
  const usedLegendIds = new Set(
    issues.value
      ?.map((issue) => issue.legend_id)
      .filter((id): id is number => id != null) || []
  );
  return legends.value.filter((legend) => usedLegendIds.has(legend.id));
});

onMounted(async () => {
  legends.value = await getLegends();
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
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
  margin-right: 8px;
}
</style>
