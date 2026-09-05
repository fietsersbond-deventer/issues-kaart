export const useLegendFilters = defineStore("legendFilters", () => {
  // Set of legend IDs that are currently visible (selected)
  const visibleLegendIds = ref<Set<number>>(new Set());

  // Initialize with all available legends when legends are loaded
  const { legends } = storeToRefs(useLegends());
  const route = useRoute();
  const { updateQuery } = useMapFilters();
  const { selectedTagSlugs } = storeToRefs(useMapFilters());

  function queryLegendIds() {
    if (typeof route.query.legend !== "string") return [];
    return route.query.legend
      .split(",")
      .map(Number)
      .filter((id) => Number.isInteger(id));
  }

  function syncFromQuery(newLegends: typeof legends.value) {
    if (!newLegends?.length) return;

    const selectedIds = queryLegendIds();
    visibleLegendIds.value = new Set(
      selectedIds.length > 0
        ? selectedIds.filter((id) =>
            newLegends.some((legend) => legend.id === id),
          )
        : newLegends.map((legend) => legend.id),
    );
  }

  // Keep the selection synchronized when navigating or changing the URL.
  watch(
    [legends, () => route.path, () => route.query.legend],
    ([newLegends]) => {
      syncFromQuery(newLegends);
    },
    { immediate: true },
  );

  // Computed: determine if we're showing all legends based on the current selection
  const isShowingAll = computed(() => {
    if (!legends.value || legends.value.length === 0) return true;

    const allLegendIds = new Set(legends.value.map((legend) => legend.id));
    const visibleIds = visibleLegendIds.value;

    // We're showing all if the sets are the same size and contain the same elements
    return (
      allLegendIds.size === visibleIds.size &&
      [...allLegendIds].every((id) => visibleIds.has(id))
    );
  });

  /**
   * Toggle the visibility of a legend with special first-click behavior
   */
  function toggleLegendVisibility(legendId: number) {
    if (isShowingAll.value) {
      // First click: show only this legend
      visibleLegendIds.value = new Set([legendId]);
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
        }
      } else {
        // Trigger reactivity for the set
        visibleLegendIds.value = new Set(visibleLegendIds.value);
      }
    }

    void updateQuery(
      [...visibleLegendIds.value].sort((a, b) => a - b),
      [...selectedTagSlugs.value].sort(),
    );
  }

  /**
   * Check if a legend is visible
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
      void updateQuery(
        [...visibleLegendIds.value].sort((a, b) => a - b),
        [...selectedTagSlugs.value].sort(),
      );
    }
  }

  return {
    visibleLegendIds: readonly(visibleLegendIds),
    isShowingAll,
    toggleLegendVisibility,
    isLegendVisible,
    showAllLegends,
  };
});
