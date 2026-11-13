import type { Feature, Point } from "geojson";

type GeoapifyProperties = {
  place_id?: string;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  result_type?: string;
  category?: string;
  lat: number;
  lon: number;
};

/**
 * Doorzoekt Geoapify's Address Autocomplete API. Vereist een (gratis) API key
 * via NUXT_PUBLIC_GEOAPIFY_API_KEY; zonder key wordt deze provider overgeslagen.
 * Let op: de autocomplete-respons bevat geen bounding box, alleen een punt.
 */
export const GeoapifySearchProvider: SearchProvider<GeoapifyProperties> = {
  search: async (query: string, params?: GazetteerSearchParams) => {
    if (query.trim().length < 2) return [];

    const { apiKey } = useRuntimeConfig().public.geoapify;
    if (!apiKey) return [];

    const filters = [`countrycode:${params?.countrycodes ?? "nl"}`];
    const query_: Record<string, string> = {
      text: query,
      limit: "10",
      lang: "nl",
      apiKey,
    };
    if (params?.bbox) {
      const { west, south, east, north } = params.bbox;
      filters.push(`rect:${west},${south},${east},${north}`);
      query_.bias = `rect:${west},${south},${east},${north}`;
    }
    query_.filter = filters.join("|");

    try {
      const data = await $fetch<{
        features: Feature<Point, GeoapifyProperties>[];
      }>("https://api.geoapify.com/v1/geocode/autocomplete", {
        query: query_,
      });

      return data.features.map((feature): SearchResult<GeoapifyProperties> => {
        const props = feature.properties;
        return {
          id: props.place_id ?? `${props.lon}_${props.lat}`,
          label: props.formatted ?? props.name ?? "",
          lat: props.lat,
          lon: props.lon,
          type: props.category ?? props.result_type,
          raw: { type: "Feature", properties: props, raw: props },
        };
      });
    } catch (err) {
      console.warn("Error with fetching Geoapify search results: ", err);
      return [];
    }
  },
};
