import type { Issue, NewIssue, ExistingIssue } from "~~/shared/types/Issue";

export const useSelectedIssue = defineStore("selectedIssue", () => {
  const route = useRoute();

  const { isEditing } = useIsEditing();

  const selectedId = ref<number | null>(null);

  const issue = ref<Issue | null>(null);

  // Use shared WebSocket to receive updates for the selected issue
  const ws = useSharedIssuesWebSocket();

  // Access categories store to enrich issues with legend info
  const { categories } = storeToRefs(useCategories());

  /**
   * Enriches an issue with legend from the categories store
   */
  function enrichIssueWithLegend(issueData: ExistingIssue): ExistingIssue {
    if (issueData.legend_id && categories.value) {
      const legend = categories.value.find((l) => l.id === issueData.legend_id);
      if (legend) {
        return {
          ...issueData,
          legend: legend,
        };
      }
    }
    return issueData;
  }

  // Subscribe to WebSocket messages
  const unsubscribe = ws.subscribe((parsed) => {
    if (!selectedId.value) return;

    if (parsed.type === "issue-modified") {
      let updatedIssue = parsed.payload as ExistingIssue;

      // Parse geometry if it's a string
      if (updatedIssue.geometry && typeof updatedIssue.geometry === "string") {
        updatedIssue.geometry = JSON.parse(updatedIssue.geometry);
      }

      // Enrich with legend info from categories store
      updatedIssue = enrichIssueWithLegend(updatedIssue);

      // Only update if this is the issue we're viewing
      if (updatedIssue.id === selectedId.value) {
        issue.value = updatedIssue;
      }
    } else if (parsed.type === "issue-deleted") {
      const deletedId = parsed.payload as number;
      // If the issue we're viewing was deleted, navigate away
      if (deletedId === selectedId.value) {
        navigateTo("/kaart");
      }
    }
  });

  // Cleanup subscription when store is disposed
  onUnmounted(unsubscribe);

  watch(
    () => route.params.id,
    async (newId) => {
      if (newId === "new") {
        selectedId.value = null;
        isEditing.value = true;
        return;
      }
      const id = +(newId ?? 0) || null;
      selectedId.value = id;
      isEditing.value = false;

      // Fetch full issue data when selecting an issue
      if (id !== null) {
        issue.value = await $fetch<Issue>(`/api/issues/${id}`);
      }
    },
    { immediate: true },
  );

  const newIssue: NewIssue = {
    title: "",
    description: "",
    tags: [],
  };

  watch(
    selectedId,
    (id) => {
      if (id === null) {
        issue.value = { ...newIssue };
      }
    },
    { immediate: true },
  );

  return {
    selectedId,
    issue,
  };
});
