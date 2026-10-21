import { shallowRef, toRaw, triggerRef, onScopeDispose } from "vue";
import { defineStore } from "pinia";
import type { Issue, NewIssue, MapIssue } from "~~/shared/types/Issue";
import type { WebSocketMessage } from "~~/shared/types/WebSocketMessages";
import { useThrottleFn } from "@vueuse/core";

export const useIssues = defineStore("issues", () => {
  const ws = useSharedIssuesWebSocket();
  const issues = shallowRef<(MapIssue | NewIssue)[]>([]);
  const viewportRevision = ref(0);
  const indices = new Map<number | undefined, number>();

  // Get categories for enriching issues
  const categoriesStore = useCategories();
  const { categories } = storeToRefs(categoriesStore);

  const legendsById = computed(
    () =>
      new Map(
        (categories.value ?? []).map((legend) => [legend.id, toRaw(legend)]),
      ),
  );

  const fetchOptions = {
    deep: false,
    query: { fields: "id,title,legend_id,bbox,imageUrl,tags" },
  };
  const {
    data,
    refresh: refreshIssues,
    status,
  } = useFetch<MapIssue[]>("/api/issues", fetchOptions);

  let hasConnected = ws.status.value === "OPEN";
  watch(ws.status, (state) => {
    if (state !== "OPEN") return;
    if (hasConnected) refreshIssues();
    hasConnected = true;
  });

  function processIssue<T extends MapIssue | NewIssue>(input: T): T {
    const issue = { ...toRaw(input) };
    if (issue.geometry)
      issue.geometry =
        typeof issue.geometry === "string"
          ? JSON.parse(issue.geometry)
          : toRaw(issue.geometry);
    if (issue.legend_id && categories.value) {
      issue.legend = toRaw(
        legendsById.value.get(issue.legend_id) ?? issue.legend,
      );
    }
    return issue as T;
  }

  function upsert(issue: MapIssue | NewIssue, invalidate = true) {
    const index = indices.get(issue.id);
    if (index === undefined) {
      indices.set(issue.id, issues.value.length);
      issues.value.push(issue);
    } else issues.value[index] = issue;
    triggerRef(issues);
    if (invalidate) viewportRevision.value++;
  }

  function replaceSnapshot(rows: (MapIssue | NewIssue)[]) {
    indices.clear();
    rows.forEach((issue, index) => indices.set(issue.id, index));
    issues.value = rows;
    viewportRevision.value++;
  }

  const unsubscribe = ws.subscribe((parsed: WebSocketMessage) => {
    switch (parsed.type) {
      case "issue-created":
      case "issue-modified":
        upsert(processIssue(parsed.payload as Issue));
        break;
      case "issue-deleted": {
        const id = (parsed as WebSocketMessage<"issue-deleted">).payload.id;
        replaceSnapshot(issues.value.filter((issue) => issue.id !== id));
        break;
      }
      case "issues-imported":
        viewportRevision.value++;
        refreshIssues();
        categoriesStore.refresh?.();
        break;
    }
  });

  // any changes to the selected issue should be reflected in this store
  const { issue } = storeToRefs(useSelectedIssue());
  const { isEditing } = useIsEditing();
  function updateIssue(issue: Issue | NewIssue | null) {
    if (!issue) return;

    const preview = processIssue(issue);
    // Only the selected editor record needs a detached geometry snapshot.
    if (preview.geometry)
      preview.geometry = structuredClone(toRaw(preview.geometry));
    upsert(preview, false);
  }
  const throttledUpdate = useThrottleFn(updateIssue, 100);

  // watch issue and update store accordingly
  watch(
    issue,
    (updatedIssue) => {
      throttledUpdate(updatedIssue);
    },
    { deep: true },
  );

  // Cleanup subscription when store is disposed
  onScopeDispose(unsubscribe);

  watch(
    data,
    (newData) => {
      if (newData) {
        replaceSnapshot(newData.map((issue) => processIssue(issue)));
      } else {
        replaceSnapshot([]);
      }
      // Keep the editor's local preview when replacing the persisted snapshot.
      if (isEditing.value) updateIssue(issue.value);
    },
    { immediate: true },
  );

  // Reprocess issues when categories change
  watch(
    categories,
    () => {
      if (issues.value.length > 0) {
        replaceSnapshot(issues.value.map((issue) => processIssue(issue)));
      }
    },
    { deep: true },
  );

  function refresh() {
    refreshIssues();
  }

  const isLoaded = computed(() => status.value === "success");

  // Expose CRUD methods (WebSocket handles updates automatically)
  const methods = useIssuesMethods();

  return {
    issues,
    viewportRevision,
    isLoaded,
    refresh,
    ...methods,
  };
});
