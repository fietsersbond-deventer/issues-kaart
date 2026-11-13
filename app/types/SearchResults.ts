export type PDOKProperties = {
  collection_id: string;
  collection_geometry_type?: string;
  display_name?: string;
  highlight?: string;
  href?: string[];
  score?: number;
  [key: string]: unknown;
};

export type SearchResultRaw = {
  type: "Feature";
  properties?: Record<string, unknown> | PDOKProperties;
  geometry?: GeoJSON.Geometry;
  id?: string | number;
};

export type SearchResult<TRawResult = SearchResultRaw> = {
  label: string;
  labelHtml?: SanitizedHTML;
  lat: number;
  lon: number;
  boundingbox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  geometry?: GeoJSON.Geometry;
  type?: string;
  id?: string;
  raw?: {
    type?: string;
    properties?: Record<string, unknown> | PDOKProperties;
    geometry?: GeoJSON.Geometry;
    id?: string | number;
    raw?: TRawResult;
  };
};

/** Params die elke zoekprovider begrijpt, ongeacht de onderliggende bron. */
export type GazetteerSearchParams = {
  bbox?: { west: number; south: number; east: number; north: number };
  countrycodes?: string;
  limit?: number;
  signal?: AbortSignal;
};

/** Generieke zoekprovider-interface, zodat bronnen onderling vervangbaar zijn. */
export type SearchProvider<TRaw = unknown> = {
  search: (
    query: string,
    params?: GazetteerSearchParams,
  ) => Promise<SearchResult<TRaw>[]>;
};
