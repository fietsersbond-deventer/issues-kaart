/**
 * The query for links to the list: its last search (?s=), page and page size,
 * plus the current category and tag filters. The page is only kept while the filters
 * are unchanged, otherwise it may point past the end of the new selection.
 */
export function useListQuery() {
  const filterQuery = useFilterQuery();
  const lastListQuery = useState<Record<string, string>>(
    "last-list-query",
    () => ({}),
  );

  function rememberListQuery(query: Record<string, unknown>) {
    lastListQuery.value = Object.fromEntries(
      ["s", "page", "pageSize", "cat", "tag"]
        .map((key) => [key, query[key]])
        .filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1] !== "",
        ),
    );
  }

  const listQuery = computed(() => {
    const { s, page, pageSize, cat, tag } = lastListQuery.value;
    const filters = filterQuery.value;
    const sameFilters = cat === filters.cat && tag === filters.tag;
    return {
      ...(s ? { s } : {}),
      ...(page && sameFilters ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
      ...filters,
    };
  });

  return { listQuery, rememberListQuery };
}
