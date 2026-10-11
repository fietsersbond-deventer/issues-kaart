<template>
  <v-btn v-if="hasActiveFilters" class="map-filter-summary" @click="resetFilters">
    <span
      ><b>{{ count }}</b> plek{{ count !== 1 ? "ken" : "" }} op de kaart</span
    >

    <v-tooltip text="Toon alles" location="top" activator="parent" />
    <v-icon icon="mdi-restore" aria-label="Toon alles" class="ml-2" />
  </v-btn>
</template>

<script setup lang="ts">
const catalogFilters = useCategoryFilters();
const mapFilters = useTagFilters();
const { isShowingAllCategories } = storeToRefs(catalogFilters);
const { selectedTags } = storeToRefs(mapFilters);
const { selectedIssues } = useSelectedIssues();

const count = computed(() => selectedIssues.value.length);

const hasActiveFilters = computed(
  () => !isShowingAllCategories.value || selectedTags.value.length > 0
);

async function resetFilters() {
  await catalogFilters.showAllCategories();
  await mapFilters.clearTags();
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
