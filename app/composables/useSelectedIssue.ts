import { useRoute } from "#app";
import { isExistingIssue, type Issue, type NewIssue } from "~/types/Issue";

export const useSelectedIssue = defineStore("selectedIssue", () => {
  const route = useRoute();

  const { issues } = storeToRefs(useIssues());
  const { isEditing } = useIsEditing();

  const selectedId = ref<number | null>(null);

  const issue = ref<Issue | null>(null);

  watch(
    () => route.params.id,
    (newId) => {
      if (newId === "new") {
        selectedId.value = null;
        isEditing.value = true;
        return;
      }
      selectedId.value = +(newId ?? 0) || null;
      isEditing.value = false;
    },
    { immediate: true }
  );

  const newIssue: NewIssue = {
    title: "",
    description: "",
    legend_id: null,
  };
  watch(
    selectedId,
    (id) => {
      if (id === null) {
        issue.value = { ...newIssue };
        issues.value?.push(issue.value);
        return;
      }
      if (issues) {
        // remove any issues that do not have an id
        issues.value = issues.value?.filter((issue) => isExistingIssue(issue));
        issue.value =
          issues.value?.find(
            (issue) => isExistingIssue(issue) && issue.id === id
          ) || null;
      }
    },
    { immediate: true }
  );

  // Also watch for changes in the issues array and update selected issue
  watch(
    issues,
    () => {
      if (selectedId.value !== null && issues.value) {
        const foundIssue = issues.value.find(
          (issue) => isExistingIssue(issue) && issue.id === selectedId.value
        );
        if (foundIssue) {
          issue.value = foundIssue;
        }
      }
    },
    { immediate: true, deep: true }
  );

  return {
    selectedId,
    issue,
  };
});
