import { defineStore } from "pinia";
import type { ExistingIssue, Issue } from "@/types/Issue";

/**
 * Issues store
 * Use the fields option to request specific fields and reduce payload size
 */
export function useIssues(options?: { fields?: string }) {
  const fields = options?.fields;
  const storeName = fields ? `issues-${fields.replace(/,/g, "-")}` : "issues";

  return defineStore(storeName, () => {
    const ws = useSharedIssuesWebSocket();

    const issues = ref<Issue[]>([]);
    const snackbar = useSharedSnackbar();

    // Check if user is authenticated (only show notifications to editors)
    const { status } = useAuth();
    const isAuthenticated = computed(() => status.value === "authenticated");

    const fetchOptions = fields ? { query: { fields } } : {};
    const { data, refresh: refreshIssues } = useFetch<Issue[]>(
      "/api/issues",
      fetchOptions
    );

    const { legends } = storeToRefs(useLegends());

    // Parse requested fields for filtering WebSocket updates
    const requestedFields = fields
      ? new Set(fields.split(",").map((f) => f.trim()))
      : null;

    // Subscribe to WebSocket messages
    const unsubscribe = ws.subscribe((parsed) => {
      console.debug(
        `[useIssues(${storeName})] Received WS message:`,
        parsed.type
      );

      const issue = parsed.payload as ExistingIssue;
      if (issue.geometry && typeof issue.geometry === "string") {
        issue.geometry = JSON.parse(issue.geometry);
      }
      const legend = legends.value?.find((l) => l.id === issue.legend_id);
      if (legend) {
        issue.legend_name = legend.name;
        issue.color = legend.color;
      }

      // Filter issue to only include fields this store requested
      let filteredIssue: Issue;
      if (requestedFields) {
        filteredIssue = {} as Issue;
        for (const field of requestedFields) {
          if (field in issue) {
            (filteredIssue as Record<string, unknown>)[field] = (
              issue as Record<string, unknown>
            )[field];
          }
          // Handle legend fields that come from join
          if (field === "legend_name" && issue.legend_name) {
            filteredIssue.legend_name = issue.legend_name;
          }
          if (field === "color" && issue.color) {
            filteredIssue.color = issue.color;
          }
          // Handle imageUrl virtual field
          if (field === "imageUrl") {
            // Check if issue has an image in description
            const hasImage =
              issue.description && issue.description.includes("data:image");
            (filteredIssue as Record<string, unknown>).imageUrl = hasImage
              ? `/api/issues/${issue.id}/image`
              : null;
          }
        }
      } else {
        filteredIssue = issue as Issue;
      }

      console.debug(
        `[useIssues(${storeName})] Filtered issue for update:`,
        filteredIssue
      );

      switch (parsed.type) {
        case "issue-created":
          issues.value.push(filteredIssue);
          if (isAuthenticated.value) {
            snackbar.showMessageOnce(`Onderwerp ${issue.title} aangemaakt`);
          }
          break;
        case "issue-modified":
          {
            const existingIndex = issues.value.findIndex(
              (i) => "id" in i && i.id === issue.id
            );

            console.debug(
              `[useIssues(${storeName})] issue-modified - Found at index:`,
              existingIndex,
              "Updating with:",
              filteredIssue
            );

            if (existingIndex !== -1) {
              issues.value[existingIndex] = filteredIssue;
              if (isAuthenticated.value) {
                snackbar.showMessageOnce(`Onderwerp ${issue.title} gewijzigd`);
              }
            } else {
              issues.value.push(filteredIssue);
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

    // Cleanup subscription when store is disposed
    onUnmounted(unsubscribe);

    watch(
      data,
      (newData) => {
        if (newData) {
          issues.value = newData;
        } else {
          issues.value = [];
        }
      },
      { immediate: true }
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
