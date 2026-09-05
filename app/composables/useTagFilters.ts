export const useTagFilters = defineStore("tagFilters", () => {
  const route = useRoute();
  const router = useRouter();
  const selectedTagSlugs = ref<Set<string>>(new Set());

  function parseTags(value: unknown): string[] {
    if (typeof value !== "string") return [];

    return value
      .split(/[+,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function syncFromQuery() {
    selectedTagSlugs.value = new Set(parseTags(route.query.tag));
  }

  watch(
    () => [route.path, route.query.tag],
    syncFromQuery,
    { immediate: true },
  );

  async function updateQuery(tagSlugs: string[]) {
    const query = { ...route.query };
    const sortedTags = [...new Set(tagSlugs)].sort();

    if (sortedTags.length > 0) query.tag = sortedTags.join("+");
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
    await updateQuery([...nextTags]);
  }

  async function clearTags(updateUrl = true) {
    selectedTagSlugs.value = new Set();
    if (!updateUrl) return;

    await updateQuery([]);
  }

  return {
    selectedTagSlugs: readonly(selectedTagSlugs),
    syncFromQuery,
    hasTag,
    toggleTag,
    clearTags,
  };
});
