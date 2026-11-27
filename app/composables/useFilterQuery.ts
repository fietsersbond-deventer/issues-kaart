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

/**
 * Removes the category and tag filters in one navigation, so a single
 * back step restores them.
 */
export function useResetFilters() {
  const route = useRoute();
  const router = useRouter();

  return () =>
    router.push({
      query: Object.fromEntries(
        Object.entries(route.query).filter(
          ([key]) => key !== "cat" && key !== "tag",
        ),
      ),
    });
}
