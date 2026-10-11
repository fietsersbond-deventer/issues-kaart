export function useSelectedIssues() {
  const { issues: allIssues } = storeToRefs(useIssues());

  const { selectedTags } = storeToRefs(useTagFilters());

  const { visibleCategoryIds, isShowingAllCategories } =
    storeToRefs(useCategoryFilters());

  const selectedIssues = computed(() => {
    return (
      allIssues.value?.filter((issue) => {
        // no filtering set: show all
        if (isShowingAllCategories.value && !selectedTags.value.length) {
          return true;
        }
        if (selectedTags.value.length) {
          // tags should all match: AND
          if (!selectedTags.value.every((tag) => issue.tags.includes(tag))) {
            return false;
          }
        }

        return visibleCategoryIds.value?.has(issue.legend_id);
      }) ?? []
    );
  });

  return { selectedIssues };
}
