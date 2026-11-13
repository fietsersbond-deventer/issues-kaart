type NominatimRaw = {
  place_id: string;
  osm_type?: string;
  osm_id?: string;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  type?: string;
  class?: string;
  boundingbox: [string, string, string, string];
  geojson?: GeoJSON.Geometry;
};

const TYPE_TRANSLATIONS: Record<string, string> = {
  residential: "straat",
  primary: "weg",
  secondary: "weg",
  tertiary: "weg",
  unclassified: "weg",
  service: "weg",
  track: "pad",
  footway: "voetpad",
  cycleway: "fietspad",
  pedestrian: "voetgangersgebied",
};

export const NominatimSearchProvider: SearchProvider<NominatimRaw> = {
  search: async (query: string, params?: GazetteerSearchParams) => {
    if (query.trim().length < 2) return [];

    const query_: Record<string, string> = {
      q: query,
      format: "json",
      limit: "10",
      addressdetails: "0",
      polygon_geojson: "1",
      countrycodes: params?.countrycodes ?? "nl",
      "accept-language": "nl,en",
    };
    if (params?.bbox) {
      const { west, south, east, north } = params.bbox;
      query_.viewbox = `${west},${north},${east},${south}`;
      query_.bounded = "1";
    }

    try {
      const data = await $fetch<NominatimRaw[]>(
        "https://nominatim.openstreetmap.org/search",
        { query: query_ },
      );

      return data
        .filter((item) => item.boundingbox?.length === 4)
        .map((item): SearchResult<NominatimRaw> => {
          const [south, north, west, east] = item.boundingbox.map(Number) as [
            number,
            number,
            number,
            number,
          ];
          const typeLabel =
            TYPE_TRANSLATIONS[item.type ?? ""] ??
            item.type?.replaceAll("_", " ");
          const name =
            item.name || item.display_name.split(",")[0] || item.display_name;
          return {
            id:
              item.osm_type && item.osm_id
                ? `${item.osm_type}_${item.osm_id}`
                : item.place_id,
            label: typeLabel ? `${name} (${typeLabel})` : name,
            lat: Number(item.lat),
            lon: Number(item.lon),
            boundingbox: { south, west, north, east },
            geometry: item.geojson,
            type: item.class === "highway" ? "straat" : item.class,
            raw: { type: "Feature", properties: item, raw: item },
          };
        });
    } catch (err) {
      console.warn("Error with fetching Nominatim search results: ", err);
      return [];
    }
  },
};
