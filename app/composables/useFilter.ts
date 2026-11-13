export function useFilter(filters: Ref<string[]>) {
  const filterRegex = computed(() => {
    return new RegExp(`(${filters.value.join("|")})`, "ig");
  });

  // Search titles and snippets are plain text. Escape them before inserting our
  // own <mark> tags, so stored text can never become executable HTML.
  function escapeHtml(text: string): string {
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, character => entities[character]!);
  }

  function emphasizeFilter(text: string): string {
    if (!filters.value.length || !text.length) return escapeHtml(text);

    let result = "";
    let previousEnd = 0;
    for (const match of text.matchAll(filterRegex.value)) {
      result += escapeHtml(text.slice(previousEnd, match.index));
      result += `<mark>${escapeHtml(match[0])}</mark>`;
      previousEnd = match.index + match[0].length;
    }
    return result + escapeHtml(text.slice(previousEnd));
  }

  return {
    filterRegex,
    emphasizeFilter,
  };
}
