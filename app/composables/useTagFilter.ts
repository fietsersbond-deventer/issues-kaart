export const useTagFilters = defineStore("tagFilters", () => {
  const route = useRoute();
  const router = useRouter();
  const selectedTags = ref<string[]>([]);

  function parseTags(value: unknown): string[] {
    if (typeof value !== "string") return [];

    return value
      .split(/[+,\s]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function syncFromQuery() {
    selectedTags.value = Array.from(new Set(parseTags(route.query.tag)));
  }

  watch(() => [route.path, route.query.tag], syncFromQuery, {
    immediate: true,
  });

  async function updateQuery() {
    const query = { ...route.query };
    const sortedTags = Array.from(selectedTags.value).sort();

    if (sortedTags.length > 0) query.tag = sortedTags.join("+");
    else delete query.tag;

    await router.replace({ query });
  }

  function hasTag(tag: string) {
    return selectedTags.value.includes(tag);
  }

  function toggleTag(tag: string) {
    const nextTags = new Set(selectedTags.value);
    if (nextTags.has(tag)) nextTags.delete(tag);
    else nextTags.add(tag);

    selectedTags.value = Array.from(nextTags);
    return updateQuery();
  }

  function setTag(tag: string) {
    selectedTags.value = [tag];
    return updateQuery();
  }

  function clearTags() {
    selectedTags.value = [];
    return updateQuery();
  }

  return {
    selectedTags,
    hasTag,
    setTag,
    toggleTag,
    clearTags,
  };
});
