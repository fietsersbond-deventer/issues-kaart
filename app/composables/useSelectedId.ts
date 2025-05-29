import { useRoute } from "#app";

export function useSelectedId() {
  const route = useRoute();

  const selectedId = ref<number | null>(null);

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
        return;
      }
      selectedId.value = +newId;
    }
  );

  return {
    selectedId,
  };
}
