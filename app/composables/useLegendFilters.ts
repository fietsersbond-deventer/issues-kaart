export const useLegendFilters = defineStore("legendFilters", () => {
  // Set of legend IDs that are currently visible (selected)
  // By default, all legends are visible
  const visibleLegendIds = ref<Set<number>>(new Set());

  // Initialize with all available legends when legends are loaded
  const { legends } = storeToRefs(useLegends());

  // Initialize visibleLegendIds when legends are first loaded
  watch(
    legends,
    (newLegends) => {
      if (
        newLegends &&
        newLegends.length > 0 &&
        visibleLegendIds.value.size === 0
      ) {
        // Initialize with all legend IDs visible
        visibleLegendIds.value = new Set(newLegends.map((legend) => legend.id));
      }
    },
    { immediate: true }
  );

  /**
   * Toggle the visibility of a legend
   */
  function toggleLegendVisibility(legendId: number) {
    if (visibleLegendIds.value.has(legendId)) {
      visibleLegendIds.value.delete(legendId);
    } else {
      visibleLegendIds.value.add(legendId);
    }
    // Trigger reactivity
    visibleLegendIds.value = new Set(visibleLegendIds.value);
  }

  /**
   * Check if a legend is visible
   */
  function isLegendVisible(legendId: number): boolean {
    return visibleLegendIds.value.has(legendId);
  }

  return {
    visibleLegendIds: readonly(visibleLegendIds),
    toggleLegendVisibility,
    isLegendVisible,
  };
});
