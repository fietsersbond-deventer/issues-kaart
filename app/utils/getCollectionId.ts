/** De PDOK-collectienaam (bv. "adres", "woonplaats") van een zoekresultaat, indien bekend. */
export function getCollectionId(item: SearchResult): string | undefined {
  if (item.type) return item.type;
  const properties = item.raw?.properties as
    { collection_id?: string } | undefined;
  return properties?.collection_id;
}
