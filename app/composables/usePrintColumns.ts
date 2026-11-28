import { useLocalStorage } from "@vueuse/core";

export type PrintColumn =
  "id" | "image" | "title" | "categories" | "map" | "qr" | "notes";

/** All print columns, in the order in which they are printed. */
export const PRINT_COLUMNS: { value: PrintColumn; title: string }[] = [
  { value: "id", title: "Nummer" },
  { value: "image", title: "Foto" },
  { value: "title", title: "Onderwerp" },
  { value: "categories", title: "Categorie en tags" },
  { value: "map", title: "Kaartje" },
  { value: "qr", title: "QR-code" },
  { value: "notes", title: "Notities" },
];

const DEFAULT_COLUMNS: PrintColumn[] = ["image", "title", "qr"];

/**
 * The columns chosen for printing a selection of issues, kept in localStorage.
 * Read after mounting, which keeps hydration consistent.
 */
export function usePrintColumns() {
  const storedColumns = useLocalStorage<PrintColumn[]>(
    "print-columns",
    DEFAULT_COLUMNS,
    { initOnMounted: true },
  );

  // Ignores unknown names, e.g. from an older version, and keeps the print order.
  const columns = computed({
    get: () =>
      PRINT_COLUMNS.map(({ value }) => value).filter((column) =>
        storedColumns.value.includes(column),
      ),
    set: (value: PrintColumn[]) => {
      storedColumns.value = value;
    },
  });

  function isVisible(column: PrintColumn) {
    return columns.value.includes(column);
  }

  return { columns, isVisible };
}
