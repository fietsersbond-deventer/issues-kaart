/**
 * Levert de actieve zoekprovider. Nu alleen PDOK, maar de generieke
 * SearchProvider-interface laat ruimte om later andere bronnen toe te voegen.
 */
export function useSearchProvider(): Ref<SearchProvider> {
  return ref(PDOKSearchProvider);
}
