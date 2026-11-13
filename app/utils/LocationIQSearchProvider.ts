import type { Geometry } from "geojson";

type LocationIQResult = {
  place_id: string | number;
  osm_type?: string;
  osm_id?: string | number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  geojson?: Geometry;
  class?: string;
  type?: string;
  [key: string]: unknown;
};

function getBoundingBox(
  value: LocationIQResult["boundingbox"],
): SearchResult["boundingbox"] | undefined {
  if (!value || value.length !== 4) return undefined;

  const south = Number(value[0]);
  const north = Number(value[1]);
  const west = Number(value[2]);
  const east = Number(value[3]);
  if (![south, north, west, east].every(Number.isFinite)) return undefined;

  return { south, west, north, east };
}

/**
 * Doorzoekt LocationIQ's Nominatim-compatible API. Met polygon_geojson vraagt
 * de provider om de beschikbare featuregeometrie naast het representatieve punt.
 */
export const LocationIQSearchProvider: SearchProvider<SearchResultRaw> = {
  search: async (query: string, params?: GazetteerSearchParams) => {
    if (query.trim().length < 2) return [];

    const { apiKey } = useRuntimeConfig().public.locationiq;
    if (!apiKey) {
      console.warn("LocationIQ API key is missing.");
      return [];
    }

    const query_: Record<string, string> = {
      q: query,
      format: "json",
      limit: String(params?.limit ?? 10),
      addressdetails: "0",
      polygon_geojson: "1",
      countrycodes: params?.countrycodes ?? "nl",
      "accept-language": "nl,en",
    };
    if (params?.bbox) {
      const { west, south, east, north } = params.bbox;
      query_.viewbox = `${west},${south},${east},${north}`;
      query_.bounded = "1";
    }

    try {
      const data = await $fetch<LocationIQResult[]>(
        "https://eu1.locationiq.com/v1/search",
        { query: { ...query_, key: apiKey }, signal: params?.signal },
      );

      return data
        .filter(
          (item) =>
            Number.isFinite(Number(item.lat)) &&
            Number.isFinite(Number(item.lon)),
        )
        .map((item): SearchResult<SearchResultRaw> => {
          const properties: Record<string, unknown> = { ...item };
          const id =
            item.osm_type && item.osm_id
              ? `${item.osm_type}_${item.osm_id}`
              : String(item.place_id);
          const geometry = item.geojson;
          const label = item.display_name
            .split(",")
            .slice(0, 3)
            .map((part) => part.trim())
            .filter(Boolean)
            .join(", ");

          return {
            id,
            label: label || item.name?.trim() || item.display_name,
            lat: Number(item.lat),
            lon: Number(item.lon),
            boundingbox: getBoundingBox(item.boundingbox),
            geometry,
            type:
              item.class === "highway" ? "straat" : (item.type ?? item.class),
            raw: {
              type: "Feature",
              id: item.place_id,
              properties,
              geometry,
            },
          };
        });
    } catch (err) {
      if (params?.signal?.aborted) return [];
      console.warn("Error with fetching LocationIQ search results: ", err);
      return [];
    }
  },
};
