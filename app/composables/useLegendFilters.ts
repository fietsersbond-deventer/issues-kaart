export const useLegendFilters = defineStore("legendFilters", () => {
  // Set of legend IDs that are currently visible (selected)
  const visibleLegendIds = ref<Set<number>>(new Set());

  // Track if we're in "show all" mode (true) or selective filtering mode (false)
  const isShowingAll = ref(true);

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
        isShowingAll.value = true;
      }
    },
    { immediate: true }
  );

  /**
   * Toggle the visibility of a legend with special first-click behavior
   */
  function toggleLegendVisibility(legendId: number) {
    if (isShowingAll.value) {
      // First click: show only this legend
      visibleLegendIds.value = new Set([legendId]);
      isShowingAll.value = false;
    } else {
      // Subsequent clicks: toggle individual legends
      if (visibleLegendIds.value.has(legendId)) {
        visibleLegendIds.value.delete(legendId);
      } else {
        visibleLegendIds.value.add(legendId);
      }

      // If all legends are deselected, go back to show-all mode
      if (visibleLegendIds.value.size === 0) {
        if (legends.value) {
          visibleLegendIds.value = new Set(
            legends.value.map((legend) => legend.id)
          );
          isShowingAll.value = true;
        }
      }
    }
  }

  /**
   * Check if a legend is visible
   * In show-all mode, everything appears selected for UI purposes
   */
  function isLegendVisible(legendId: number): boolean {
    return visibleLegendIds.value.has(legendId);
  }

  /**
   * Reset to show-all mode
   */
  function showAllLegends() {
    if (legends.value) {
      visibleLegendIds.value = new Set(
        legends.value.map((legend) => legend.id)
      );
      isShowingAll.value = true;
    }
  }

  return {
    visibleLegendIds: readonly(visibleLegendIds),
    isShowingAll: readonly(isShowingAll),
    toggleLegendVisibility,
    isLegendVisible,
    showAllLegends,
  };
});
