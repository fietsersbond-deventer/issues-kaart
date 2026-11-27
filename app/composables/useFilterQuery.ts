/**
 * The category (?cat=) and tag (?tag=) filters of the current URL, so links
 * between map and list keep the same selection.
 */
export function useFilterQuery() {
  const route = useRoute();

  return computed(() => {
    const query: Record<string, string> = {};
    for (const key of ["cat", "tag"]) {
      const value = route.query[key];
      if (typeof value === "string" && value) query[key] = value;
    }
    return query;
  });
}
