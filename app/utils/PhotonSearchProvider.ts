import type { Feature, Point } from "geojson";

type PhotonProperties = {
  osm_type?: string;
  osm_id?: string;
  osm_key?: string;
  osm_value?: string;
  name?: string;
  type?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  extent?: [number, number, number, number];
};

/**
 * Doorzoekt OpenStreetMap via Komoot's Photon API. Vindt, anders dan
 * NominatimSearchProvider (vooral straten/adressen), ook losse punten van
 * interesse zoals musea en winkels.
 */
export const PhotonSearchProvider: SearchProvider<PhotonProperties> = {
  search: async (query: string, params?: GazetteerSearchParams) => {
    if (query.trim().length < 2) return [];

    // Photon's publieke API ondersteunt alleen en/de/fr/it als lang-waarde
    // (nl geeft een 400); zonder lang blijven namen gewoon in het lokale OSM-label.
    const query_: Record<string, string> = {
      q: query,
      limit: "10",
      countrycode: params?.countrycodes ?? "nl",
    };
    if (params?.bbox) {
      const { west, south, east, north } = params.bbox;
      // bbox is een harde restrictie; lat/lon/location_bias_scale blijven
      // daarbinnen de ranking bijsturen richting het midden van het gebied.
      query_.bbox = `${west},${south},${east},${north}`;
      query_.lat = String((south + north) / 2);
      query_.lon = String((west + east) / 2);
      query_.location_bias_scale = "0.4";
    }

    try {
      const data = await $fetch<{
        features: Feature<Point, PhotonProperties>[];
      }>("https://photon.komoot.io/api/", { query: query_ });

      return data.features
        .filter((feature) => feature.properties?.name)
        .map((feature): SearchResult<PhotonProperties> => {
          const props = feature.properties as PhotonProperties;
          const [lon, lat] = feature.geometry.coordinates as [number, number];
          // Photon levert extent als [west, north, east, south], niet de gebruikelijke volgorde.
          const [west, north, east, south] = props.extent ?? [];
          const typeLabel = (props.osm_value ?? props.type)?.replaceAll("_", " ");

          return {
            id:
              props.osm_type && props.osm_id
                ? `${props.osm_type}_${props.osm_id}`
                : `${props.name}_${lon}_${lat}`,
            label: typeLabel
              ? `${props.name} (${typeLabel})`
              : (props.name ?? ""),
            lat,
            lon,
            boundingbox:
              west !== undefined && south !== undefined && east !== undefined && north !== undefined
                ? { south, west, north, east }
                : undefined,
            type: props.osm_value ?? props.type,
            raw: { type: "Feature", properties: props, raw: props },
          };
        });
    } catch (err) {
      console.warn("Error with fetching Photon search results: ", err);
      return [];
    }
  },
};
