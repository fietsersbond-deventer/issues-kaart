export function useFilter(filters: Ref<string[]>) {
  const filterRegex = computed(() => {
    return new RegExp(`(${filters.value.join("|")})`, "ig");
  });

  function emphasizeFilter(string: string) {
    if (!filters.value.length) return string;

    if (string.length < 1) return string;

    const emphasized =
      string?.replace(filterRegex.value, "<mark>$&</mark>") ?? "";
    return emphasized;
  }

  return {
    filterRegex,
    emphasizeFilter,
  };
}
