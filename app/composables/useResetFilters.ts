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
