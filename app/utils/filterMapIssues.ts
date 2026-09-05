import type { MapIssue } from "~~/shared/types/Issue";

export function filterMapIssues(
  issues: MapIssue[],
  selectedTagSlugs: ReadonlySet<string>,
  visibleLegendIds: ReadonlySet<number>,
): MapIssue[] {
  return issues.filter((issue) => {
    const hasSelectedTags = [...selectedTagSlugs].every((tag) =>
      issue.tags?.includes(tag),
    );

    if (!hasSelectedTags) return false;
    if (!issue.legend_id) return true;
    return visibleLegendIds.has(issue.legend_id);
  });
}
