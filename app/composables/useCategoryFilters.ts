export const useCategoryFilters = defineStore("categoryFilters", () => {
  // Set of category IDs that are currently visible (selected)
  const selectedCategoryIds = ref<Set<number>>(new Set());

  // Initialize with all available categories when categories are loaded
  const { legends: categories } = storeToRefs(useLegends());
  // Only need legend_id to determine which legends are visible
  const { issues } = storeToRefs(useIssues({ fields: "id,legend_id" }));

  const route = useRoute();
  const router = useRouter();

  function queryCategoryIds() {
    console.log("query");
    if (typeof route.query.cat !== "string") return [];
    return route.query.cat
      .split(",")
      .map(Number)
      .filter((id) => Number.isInteger(id));
  }

  // Only show legends that are actually used in the map
  const usedCategoryIds = computed(
    () =>
      new Set(
        issues.value
          ?.map((issue) => issue.legend_id)
          .filter((id) => id != null) || [],
      ),
  );

  // get the id's from the query and intersect with the usedCategoryIds
  function syncFromQuery() {
    const queried = queryCategoryIds();
    console.log({ queried });
    selectedCategoryIds.value = new Set(queried).intersection(
      usedCategoryIds.value,
    );
    console.log("selectedCategoryIds", selectedCategoryIds.value);
  }

  // Keep the selection synchronized when navigating or changing the URL.
  watch([categories, () => route.path, () => route.query.cat], syncFromQuery, {
    immediate: true,
  });

  watch(usedCategoryIds, syncFromQuery);

  // Computed: determine if we're showing all categories based on the current selection
  const isShowingAll = computed(() => {
    if (!usedCategoryIds.value || usedCategoryIds.value.size === 0) return true;

    if (!selectedCategoryIds.value.size) return true;

    // We're showing all if the sets are the same size and contain the same elements
    return (
      usedCategoryIds.value.size === selectedCategoryIds.value.size &&
      [...usedCategoryIds.value].every((id) =>
        selectedCategoryIds.value.has(id),
      )
    );
  });

  const visibleCategoryIds = computed(() => {
    if (isShowingAll.value) return usedCategoryIds.value;
    return selectedCategoryIds.value;
  });

  /**
   * Toggle the visibility of a category with special first-click behavior
   */
  function toggleCategoryVisibility(categoryId: number) {
    if (isShowingAll.value) {
      // First click: show only this category
      selectedCategoryIds.value = new Set([categoryId]);
    } else {
      // Subsequent clicks: toggle individual categories
      if (selectedCategoryIds.value.has(categoryId)) {
        selectedCategoryIds.value.delete(categoryId);
      } else {
        selectedCategoryIds.value.add(categoryId);
      }
    }

    void updateCategoryQuery();
  }

  /**
   * Check if a category is visible
   */
  function isCategoryVisible(categoryId: number): boolean {
    return isShowingAll.value || selectedCategoryIds.value.has(categoryId);
  }

  /**
   * Reset to show-all mode
   */
  function showAllCategories(updateUrl = true) {
    if (categories.value) {
      selectedCategoryIds.value = new Set(
        categories.value.map((category) => category.id),
      );
      if (updateUrl) void updateCategoryQuery();
    }
  }

  async function updateCategoryQuery() {
    const query = { ...route.query };
    const allCategoryIds =
      categories.value?.map((category) => category.id) ?? [];
    const selectedIds = [...selectedCategoryIds.value].sort((a, b) => a - b);
    const hasAllCategories =
      allCategoryIds.length > 0 &&
      allCategoryIds.length === selectedIds.length &&
      allCategoryIds.every((id) => selectedIds.includes(id));

    if (selectedIds.length > 0 && !hasAllCategories) {
      query.cat = selectedIds.join(",");
    } else {
      delete query.cat;
    }

    await router.replace({ query });
  }

  const visibleCategories = computed(() => {
    return categories.value?.filter((category) =>
      visibleCategoryIds.value.has(category.id),
    );
  });

  return {
    visibleCategories: readonly(visibleCategories),
    visibleCategoryIds: readonly(visibleCategoryIds),
    isShowingAll,
    toggleCategoryVisibility,
    isCategoryVisible,
    showAllCategories,
  };
});
