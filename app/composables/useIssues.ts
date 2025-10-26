import { defineStore } from "pinia";
import {
  isExistingIssue,
  isNewIssue,
  type ExistingIssue,
  type Issue,
} from "@/types/Issue";
import { useThrottleFn } from "@vueuse/core";

/**
 * Issues store with optional field selection
 * Use the fields option to request specific fields and reduce payload size
 */
export function useIssues(options?: { fields?: string }) {
  const fields = options?.fields;
  const storeName = fields ? `issues-${fields.replace(/,/g, "-")}` : "issues";

  return defineStore(storeName, () => {
    const ws = useSharedIssuesWebSocket();
    const issues = ref<Issue[]>([]);
    const snackbar = useSharedSnackbar();

    // Get legends for enriching issues
    const { legends } = storeToRefs(useLegends());

    // Check if user is authenticated (only show notifications to editors)
    const { status } = useAuth();
    const isAuthenticated = computed(() => status.value === "authenticated");

    const fetchOptions = fields ? { query: { fields } } : {};
    const { data, refresh: refreshIssues } = useFetch<Issue[]>(
      "/api/issues",
      fetchOptions
    );

    function processIssue(issue: Issue): Issue {
      if (issue.geometry && typeof issue.geometry === "string") {
        issue.geometry = JSON.parse(issue.geometry);
      }

      // Handle imageUrl virtual field
      if (fields?.includes("imageUrl") && "id" in issue) {
        const hasImage =
          issue.description && issue.description.includes("data:image");
        (issue as Issue & { imageUrl?: string | null }).imageUrl = hasImage
          ? `/api/issues/${issue.id}/image`
          : null;
      }

      // Enrich with legend data if legend_id exists
      if ("legend_id" in issue && issue.legend_id && legends.value) {
        const legend = legends.value.find((l) => l.id === issue.legend_id);
        if (legend) {
          // Add legend properties to the issue for easy access
          const enrichedIssue = issue as Issue & {
            color?: string;
            icon?: string;
            icon_data_url?: string;
            legend_name?: string;
          };
          enrichedIssue.color = legend.color;
          enrichedIssue.icon = legend.icon;
          enrichedIssue.icon_data_url = legend.icon_data_url;
          enrichedIssue.legend_name = legend.name;
          return enrichedIssue;
        }
      }

      return issue;
    }

    // Subscribe to WebSocket messages
    const unsubscribe = ws.subscribe((parsed) => {
      console.debug(
        `[useIssues(${storeName})] Received WS message:`,
        parsed.type
      );

      switch (parsed.type) {
        case "issue-created": {
          const issue = processIssue(parsed.payload as Issue);
          issues.value.push(issue as ExistingIssue);
          if (isAuthenticated.value) {
            snackbar.showMessageOnce(`Onderwerp ${issue.title} aangemaakt`);
          }
          break;
        }
        case "issue-modified":
          {
            const issue = processIssue(parsed.payload as Issue);
            const existingIndex = issues.value.findIndex(
              (i) => "id" in i && i.id === (issue as ExistingIssue).id
            );

            console.debug(
              `[useIssues(${storeName})] issue-modified - Found at index:`,
              existingIndex,
              "Updating with:",
              issue
            );

            if (existingIndex !== -1) {
              issues.value[existingIndex] = issue;
              if (isAuthenticated.value) {
                snackbar.showMessageOnce(`Onderwerp ${issue.title} gewijzigd`);
              }
            } else {
              issues.value.push(issue);
              if (isAuthenticated.value) {
                snackbar.showMessageOnce(`Onderwerp ${issue.title} aangemaakt`);
              }
            }
          }
          break;
        case "issue-deleted":
          {
            const issueId = parsed.payload as number;
            issues.value = issues.value.filter(
              (i) => !("id" in i) || i.id !== issueId
            );
            if (isAuthenticated.value) {
              snackbar.showMessageOnce(`Onderwerp ${issueId} verwijderd`);
            }
          }
          break;
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
