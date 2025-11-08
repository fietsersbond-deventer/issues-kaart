import type { AdminListIssueResponse, Issue } from "./../types/Issue";
import type { Legend } from "@/types/Legend";

/**
 * Enrich a full Issue object with legend data from a legends array.
 * Used in useIssues for WebSocket and fetched data.
 */
export function enrichIssue(item: Issue, legends?: Legend[] | null): Issue {
  if (item.geometry && typeof item.geometry === "string") {
    item.geometry = JSON.parse(item.geometry);
  }

  const legend = legends?.find((l) => l.id === item.legend_id);
  return {
    ...item,
    legend: legend || item.legend,
  };
}

/**
 * Enrich admin list response items with legend data.
 * Used in admin issues page to attach legend objects to lightweight server responses.
 */
export function enrichAdminListItems(
  items: AdminListIssueResponse[] | undefined,
  legends?: Legend[] | null
): (AdminListIssueResponse & { legend?: Legend })[] {
  if (!items || items.length === 0) return [];
  return items.map((item) => {
    const legend = legends?.find((l) => l.id === item.legend_id);
    return {
      ...item,
      legend,
    };
  });
}

/**
 * Enrich an array of full Issue items. Keeps the original ordering and other fields.
 */
export function enrichIssues(
  items: Issue[] | undefined,
  legends?: Legend[] | null
): Issue[] {
  if (!items || items.length === 0) return [];
  return items.map((it) => enrichIssue(it, legends));
}

export default enrichIssues;
