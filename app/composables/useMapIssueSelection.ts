import type { MapIssue } from "~~/shared/types/Issue";

export function useMapIssueSelection(allIssues: Ref<MapIssue[]>) {
  const { selectedTagSlugs } = storeToRefs(useMapFilters());
  const { visibleLegendIds } = storeToRefs(useLegendFilters());

  const selectedIssues = computed(() =>
    allIssues.value.filter((issue) => {
      const hasSelectedTags = [...selectedTagSlugs.value].every((tag) =>
        issue.tags?.includes(tag),
      );

      if (!hasSelectedTags) return false;
      if (!issue.legend_id) return true;
      return visibleLegendIds.value.has(issue.legend_id);
    }),
  );

  return {
    selectedIssues,
  };
}
