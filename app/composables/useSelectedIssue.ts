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

  return {
    selectedId,
    issue,
  };
});
