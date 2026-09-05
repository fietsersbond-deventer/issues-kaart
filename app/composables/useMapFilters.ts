export const useMapFilters = defineStore("mapFilters", () => {
  const route = useRoute();
  const router = useRouter();
  const selectedTagSlugs = ref<Set<string>>(new Set());
  const initialized = ref(false);

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

  async function updateQuery(
    legendIds: number[],
    tagSlugs: string[],
    includeLegend = true,
  ) {
    const query = { ...route.query };

    if (legendIds.length > 0 && includeLegend) {
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
    const { visibleLegendIds, isShowingAll } = storeToRefs(useLegendFilters());
    await updateQuery(
      [...visibleLegendIds.value].sort((a, b) => a - b),
      [...nextTags].sort(),
      !isShowingAll.value,
    );
  }

  async function clearTags(updateUrl = true) {
    selectedTagSlugs.value = new Set();
    if (!updateUrl) return;

    const { visibleLegendIds, isShowingAll } = storeToRefs(useLegendFilters());
    await updateQuery(
      [...visibleLegendIds.value].sort((a, b) => a - b),
      [],
      !isShowingAll.value,
    );
  }

  return {
    selectedTagSlugs: readonly(selectedTagSlugs),
    initialized: readonly(initialized),
    syncFromQuery,
    hasTag,
    toggleTag,
    clearTags,
    updateQuery,
  };
});
