import { defineStore } from "pinia";
import {
  isExistingIssue,
  isNewIssue,
  type Issue,
} from "@/types/Issue";
import type { WebSocketMessage } from "@/types/WebSocketMessages";
import { useThrottleFn } from "@vueuse/core";

/**
 * Issues store with optional field selection
 * Use the fields option to request specific fields and reduce payload size
 */
export function useIssues(options?: {
  fields?: string;
}) {
  const fields = options?.fields;
  const storeName = fields ? `issues-${fields.replace(/,/g, "-")}` : "issues";

  return defineStore(storeName, () => {
    const ws = useSharedIssuesWebSocket();
    const issues = ref<Issue[]>([]);

    // Get legends for enriching issues
    const { legends } = storeToRefs(useLegends());

    const fetchOptions = fields ? { query: { fields } } : {};
    const { data, refresh: refreshIssues } = useFetch<Issue[]>(
      "/api/issues",
      fetchOptions
    );

    function processIssue(issue: Issue): Issue {
      if (issue.geometry && typeof issue.geometry === "string") {
        issue.geometry = JSON.parse(issue.geometry);
      }

      // Enrich with legend data if legend_id exists
      if ("legend_id" in issue && issue.legend_id && legends.value) {
        const legend = legends.value.find((l) => l.id === issue.legend_id);
        if (legend) {
          // Add the full legend object to the issue
          const enrichedIssue = issue as Issue & { legend: typeof legend };
          enrichedIssue.legend = legend;
          return enrichedIssue;
        }
      }

      return issue;
    }

    // Subscribe to WebSocket messages
    const unsubscribe = ws.subscribe((parsed: WebSocketMessage) => {

      switch (parsed.type) {
        case "issue-created": {
          const issue = processIssue(parsed.payload as Issue);
          issues.value.push(issue);
          break;
        }
        case "issue-modified": {
          const issue = processIssue(parsed.payload as Issue);
          const existingIndex = issues.value.findIndex(
            (i) => "id" in i && i.id === ("id" in issue ? issue.id : undefined)
          );

          if (existingIndex !== -1) {
            issues.value[existingIndex] = issue;
          } else {
            issues.value.push(issue);
          }
          break;
        }
        case "issue-deleted": {
          const payload = (parsed as WebSocketMessage<"issue-deleted">).payload;
          const issueId = payload.id;

          issues.value = issues.value.filter((i) => i.id !== issueId);
          break;
        }
        default:
          console.debug("Unknown WebSocket message type:", parsed.type);
      }
    });

    // any changes to the selected issue should be reflected in this store
    const { issue } = storeToRefs(useSelectedIssue());
    const throttledUpdate = useThrottleFn((issue: Issue | null) => {
      if (!issue) return;

      const existingIndex = issues.value.findIndex(
        (i) =>
          (isNewIssue(issue) && isNewIssue(i)) ||
          (isExistingIssue(issue) && isExistingIssue(i) && i.id === issue.id)
      );

      if (existingIndex !== -1) {
        // Update existing issue in store
        issues.value[existingIndex] = processIssue(issue);
      } else {
        // Add new issue to store
        issues.value.push(processIssue(issue));
      }
    }, 100);

    // watch issue and update store accordingly
    watch(
      issue,
      (updatedIssue) => {
        throttledUpdate(updatedIssue);
      },
      { deep: true }
    );

    // Cleanup subscription when store is disposed
    onUnmounted(unsubscribe);

    watch(
      data,
      (newData) => {
        if (newData) {
          issues.value = newData.map((issue) => processIssue(issue));
        } else {
          issues.value = [];
        }
      },
      { immediate: true }
    );

    // Reprocess issues when legends change
    watch(
      legends,
      () => {
        if (issues.value.length > 0) {
          issues.value = issues.value.map((issue) => processIssue(issue));
        }
      },
      { deep: true }
    );

    function refresh() {
      refreshIssues();
    }

    // Expose CRUD methods (WebSocket handles updates automatically)
    const methods = useIssuesMethods();

    return {
      issues,
      refresh,
      ...methods,
    };
  })();
}
