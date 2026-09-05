<template>
  <div v-if="hasActiveFilters" class="map-filter-summary">
    <span>{{ count }} plekken op de kaart</span>
    <v-btn
      icon="mdi-filter-off-outline"
      variant="text"
      size="small"
      aria-label="Filters uitschakelen"
      @click="resetFilters"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count: number;
}>();

const legendFilters = useLegendFilters();
const mapFilters = useMapFilters();
const { isShowingAll } = storeToRefs(legendFilters);
const { selectedTagSlugs } = storeToRefs(mapFilters);

const hasActiveFilters = computed(
  () => !isShowingAll.value || selectedTagSlugs.value.size > 0,
);

function resetFilters() {
  void legendFilters.resetFilters();
}
</script>

<style scoped>
.map-filter-summary {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 4px 8px 4px 14px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  color: rgba(0, 0, 0, 0.8);
  transform: translateX(-50%);
}
</style>
