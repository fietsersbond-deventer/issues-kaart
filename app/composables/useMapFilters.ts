export const useMapFilters = defineStore("mapFilters", () => {
  const route = useRoute();
  const router = useRouter();
  const selectedTagSlugs = ref<Set<string>>(new Set());
  const initialized = ref(false);
  const { legends } = storeToRefs(useLegends());

  function parseList(value: unknown): string[] {
    if (typeof value !== "string") return [];

    return value
      .split(/[+,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function syncFromQuery() {
    const queryLegendIds = parseList(route.query.legend)
      .map(Number)
      .filter((id) => Number.isInteger(id));
    const queryTags = parseList(route.query.tag);

    selectedTagSlugs.value = new Set(queryTags);
    initialized.value = true;

    return queryLegendIds;
  }

  watch(
    () => [route.path, route.query.tag],
    () => {
      syncFromQuery();
    },
    { immediate: true },
  );

  async function updateQuery(legendIds: number[], tagSlugs: string[]) {
    const query = { ...route.query };
    const allLegendIds = legends.value.map((legend) => legend.id);
    const hasAllLegends =
      allLegendIds.length > 0 &&
      allLegendIds.length === legendIds.length &&
      allLegendIds.every((id) => legendIds.includes(id));

    if (legendIds.length > 0 && !hasAllLegends) {
      query.legend = legendIds.join(",");
    } else delete query.legend;

    if (tagSlugs.length > 0) query.tag = tagSlugs.join("+");
    else delete query.tag;

    await router.replace({ query });
  }

  function hasTag(tag: string) {
    return selectedTagSlugs.value.has(tag);
  }

  async function toggleTag(tag: string) {
    const nextTags = new Set(selectedTagSlugs.value);
    if (nextTags.has(tag)) nextTags.delete(tag);
    else nextTags.add(tag);

    selectedTagSlugs.value = nextTags;
    const { visibleLegendIds } = storeToRefs(useLegendFilters());
    await updateQuery(
      [...visibleLegendIds.value].sort((a, b) => a - b),
      [...nextTags].sort(),
    );
  }

  return {
    selectedTagSlugs: readonly(selectedTagSlugs),
    initialized: readonly(initialized),
    syncFromQuery,
    hasTag,
    toggleTag,
    updateQuery,
  };
});
