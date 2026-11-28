import { useLocalStorage } from "@vueuse/core";

export type PrintOrientation = "landscape" | "portrait";

/**
 * Paper orientation for printing a selection of issues, kept in localStorage.
 * Landscape by default: it leaves more room for the columns.
 */
export function usePrintOrientation() {
  const storedOrientation = useLocalStorage<PrintOrientation>(
    "print-orientation",
    "landscape",
    { initOnMounted: true },
  );

  const orientation = computed({
    get: (): PrintOrientation =>
      storedOrientation.value === "portrait" ? "portrait" : "landscape",
    set: (value: PrintOrientation) => {
      storedOrientation.value = value;
    },
  });

  return { orientation };
}
