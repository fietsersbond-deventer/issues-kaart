import { useSessionStorage } from "@vueuse/core";

/**
 * The issues selected in the list for printing, and whether the list is in
 * selection mode. Kept in sessionStorage, so the selection survives a reload and
 * reaches the print page. Read after mounting, which keeps hydration consistent.
 */
export function usePrintSelection() {
  const isSelecting = useSessionStorage("print-selecting", false, {
    initOnMounted: true,
  });
  const selectedIds = useSessionStorage<number[]>("print-selected-ids", [], {
    initOnMounted: true,
  });

  function startSelecting() {
    isSelecting.value = true;
  }

  function stopSelecting() {
    isSelecting.value = false;
    selectedIds.value = [];
  }

  function toggleSelected(id: number) {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((selectedId) => selectedId !== id)
      : [...selectedIds.value, id];
  }

  /** Adds ids to the selection, e.g. all results of a search. */
  function addSelected(ids: number[]) {
    selectedIds.value = [...new Set([...selectedIds.value, ...ids])];
  }

  function clearSelected() {
    selectedIds.value = [];
  }

  return {
    isSelecting,
    selectedIds,
    startSelecting,
    stopSelecting,
    toggleSelected,
    addSelected,
    clearSelected,
  };
}
