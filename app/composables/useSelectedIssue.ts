import { useRoute } from "#app";
import type { Issue } from "~/types/Issue";

export const useSelectedIssue = defineStore("selectedIssue", () => {
  const route = useRoute();

  const { issues } = storeToRefs(useIssues());
  const { isEditing } = useIsEditing();

  const selectedId = ref<number | null>(null);

  const issue = ref<Issue | null>(null);

  const newIssue: Issue = {
    title: "",
    description: "",
    legend_id: null,
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
  };
  watch(
    [selectedId, issues],
    ([id, issues]) => {
      if (id === null || id === undefined) {
        issue.value = { ...newIssue };
        return;
      }
      if (issues) {
        issue.value = issues.find((issue) => issue.id === id) || null;
      } else {
        issue.value = { ...newIssue };
      }
    },
    { immediate: true }
  );

  watch(
    () => route.params.id,
    (newId) => {
      if (
        newId === undefined ||
        newId === null ||
        newId === "new" ||
        Array.isArray(newId)
      ) {
        selectedId.value = null;
        isEditing.value = true;
        return;
      }
      selectedId.value = +newId;
      isEditing.value = false;
    },
    { immediate: true }
  );

  return {
    selectedId,
    issue,
  };
});
