import type { PrintIssue } from "~~/shared/types/Issue";

/**
 * Loads the issues selected for printing. The selection lives in sessionStorage,
 * which is read after mounting, so loading starts then too.
 */
export function usePrintIssues() {
  const { selectedIds } = usePrintSelection();
  const { token } = useAuth();

  const issues = ref<PrintIssue[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  onMounted(async () => {
    if (!selectedIds.value.length) {
      loading.value = false;
      return;
    }
    try {
      issues.value = await $fetch<PrintIssue[]>("/api/issues/print", {
        query: { ids: selectedIds.value.join(",") },
        headers: token.value
          ? {
              Authorization: `Bearer ${token.value.replace(/^Bearer\s+/i, "")}`,
            }
          : undefined,
      });
    } catch (fetchError) {
      console.error("Failed to load issues for printing:", fetchError);
      error.value = "De onderwerpen konden niet worden geladen";
    } finally {
      loading.value = false;
    }
  });

  return { issues, loading, error };
}
