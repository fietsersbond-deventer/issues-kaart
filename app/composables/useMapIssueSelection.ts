import type { MapIssue } from "~~/shared/types/Issue";
import { filterMapIssues } from "~/utils/filterMapIssues";

export const useMapIssueSelection = defineStore("mapIssueSelection", () => {
  const { issues: allIssues, isLoaded: issuesReady } = storeToRefs(
    useIssues({ fields: "id,title,legend_id,geometry,imageUrl,tags" as const }),
  );
  const { selectedTagSlugs } = storeToRefs(useTagFilters());
  const { visibleLegendIds } = storeToRefs(useLegendFilters());

  const selectedIssues = computed(() =>
    filterMapIssues(
      allIssues.value,
      selectedTagSlugs.value,
      visibleLegendIds.value,
    ),
  );

  return {
    allIssues,
    issuesReady,
    selectedIssues,
  };
});
