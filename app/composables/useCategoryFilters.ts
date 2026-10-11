export const useCategoryFilters = defineStore("categoryFilters", () => {
  const { categories } = storeToRefs(useCategories());
  const { issues } = storeToRefs(useIssues());

  const route = useRoute();
  const router = useRouter();

  // determine which category id's are actually assigned to issues
  const usedCategoryIds = computed(
    () =>
      new Set(
        (issues.value ?? [])
          .map((issue) => issue.legend_id)
          .filter((id) => id != null),
      ),
  );

  // get the selected category ids from query ?cat=1,2,3
  const selectedCategoryIds = computed(() => {
    const cat = route.query.cat;
    if (typeof cat !== "string") return new Set<number>();
    const queried = cat
      .split(",")
      .map(Number)
      .filter((id) => Number.isInteger(id));

    // make sure only categoryIds that are actually used can be selected
    // otherwise isShowingAll may fail
    return new Set(queried).intersection(usedCategoryIds.value);
  });

  const isShowingAll = computed(() => {
    const used = usedCategoryIds.value;
    const selected = selectedCategoryIds.value;
    return (
      used.size === 0 || selected.size === 0 || selected.size === used.size
    );
  });

  // which id's should be visible in the map?
  const visibleCategoryIds: Ref<Set<number>> = computed(() => {
    if (isShowingAll.value) return usedCategoryIds.value;
    return selectedCategoryIds.value;
  });

  function toggleCategoryVisibility(categoryId: number) {
    if (isShowingAll.value) {
      // First click: show only this category
      return syncWithQuery(new Set([categoryId]));
    }
    const newSelection = new Set(selectedCategoryIds.value);
    if (newSelection.has(categoryId)) newSelection.delete(categoryId);
    else newSelection.add(categoryId);
    return syncWithQuery(newSelection);
  }

  /**
   * Check if a category is visible
   */
  function isCategoryVisible(categoryId: number): boolean {
    return visibleCategoryIds.value.has(categoryId);
  }

  /**
   * Reset to show-all mode
   */
  function showAllCategories(updateUrl = true) {
    if (updateUrl) return syncWithQuery(new Set());
  }

  async function syncWithQuery(ids: Set<number>) {
    const query = { ...route.query };

    if (ids.size > 0 && ids.size !== usedCategoryIds.value.size) {
      query.cat = [...ids].sort((a, b) => a - b).join(",");
    } else {
      delete query.cat;
    }

    await router.replace({ query });
  }

  const usedCategories = computed(() =>
    categories.value?.filter((category) =>
      usedCategoryIds.value.has(category.id),
    ),
  );

  return {
    usedCategories,
    visibleCategoryIds,
    isShowingAll,
    toggleCategoryVisibility,
    isCategoryVisible,
    showAllCategories,
  };
});
