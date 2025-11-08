export type SearchResult<T> = {
  total: number;
  page: number;
  itemsPerPage: number;
  items: T[];
};
