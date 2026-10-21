import { onScopeDispose } from "vue";
import { isExistingIssue, type Issue, type NewIssue, type ExistingIssue } from "~~/shared/types/Issue";

export const useSelectedIssue = defineStore("selectedIssue", () => {
  const route = useRoute();

  const { isEditing } = useIsEditing();

  const selectedId = ref<number | null>(null);

  const issue = ref<Issue | NewIssue | null>(null);
  const loadError = ref("");

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

  watch(
    categories,
    () => {
      if (issue.value && isExistingIssue(issue.value)) {
        issue.value = enrichIssueWithLegend(issue.value);
      }
    },
    { deep: true },
  );

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
      const deletedId = (parsed.payload as WebSocketMessage<"issue-deleted">["payload"]).id;
      // If the issue we're viewing was deleted, navigate away
      if (deletedId === selectedId.value) {
        navigateTo({ path: "/kaart", query: route.query });
      }
    }
  });

  // Cleanup subscription when store is disposed
  onScopeDispose(unsubscribe);

  const reload = ref(0);
  let hasConnected = ws.status.value === "OPEN";
  watch(ws.status, (state) => {
    if (state !== "OPEN") return;
    if (hasConnected && !isEditing.value) reload.value++;
    hasConnected = true;
  });

  watch(
    [() => route.params.id, reload],
    async ([newId], _oldValue, onCleanup) => {
      let current = true;
      onCleanup(() => {
        current = false;
      });
      loadError.value = "";
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
        issue.value = null;
        try {
          const loadedIssue = await $fetch<Issue>(`/api/issues/${id}`);
          if (current) issue.value = enrichIssueWithLegend(loadedIssue);
        } catch (error) {
          if (!current) return;
          const status = (error as { statusCode?: number }).statusCode;
          loadError.value = status === 404
            ? "Onderwerp niet gevonden"
            : "Onderwerp kon niet worden geladen";
        }
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
    loadError,
  };
});
