import type { Feature, FeatureCollection, Point } from "geojson";
import { center } from "@turf/center";

export type PDOKObject = {
  collection_geometry_type: string;
  collection_id: string;
  collection_version: number;
  display_name: string;
  highlight: string;
  href: string[];
  score: number;
};

export type GazetteerPDOKSearchParams = GazetteerSearchParams & {
  crs?: string;
};

function convertToSearchResult(
  feature: Feature<Point, PDOKObject>,
): SearchResult<Feature<Point, PDOKObject>> {
  let boundingbox: SearchResult["boundingbox"];
  if (feature.bbox) {
    const [west, south, east, north] = feature.bbox as [
      number,
      number,
      number,
      number,
    ];
    boundingbox = { south, west, north, east };
  }
  const [lon, lat] = center(feature).geometry.coordinates as [number, number];
  return {
    id: `${feature.id}`,
    label: feature.properties.display_name,
    labelHtml: SanitizedHTML.from(feature.properties.highlight),
    type: feature.properties.collection_id,
    lat,
    lon,
    boundingbox,
    raw: feature as unknown as SearchResultRaw,
  };
}

// PDOK verwacht per collectie bracket-notatie (plaats[version]=1), geen geneste objecten.
function flattenCollections(
  collections: Partial<PDOKSearchCollections> | undefined,
): Record<string, number> {
  const flat: Record<string, number> = {};
  for (const [name, config] of Object.entries(collections ?? {})) {
    if (!config) continue;
    flat[`${name}[version]`] = config.version;
    flat[`${name}[relevance]`] = config.relevance;
  }
  return flat;
}

let abortController: AbortController | null = null;

const defaultCollections: Readonly<Partial<PDOKSearchCollections>> = {
  woonplaats: { version: 1, relevance: 1 },
  plaats: { version: 1, relevance: 0.8 },
  adres: { version: 1, relevance: 0.5 },
  provinciegebied: { version: 1, relevance: 0.5 },
  gemeentegebied: { version: 1, relevance: 0.5 },
  functioneel_gebied: { version: 0, relevance: 0.5 },
  perceel: { version: 0, relevance: 0.5 },
  geografisch_gebied: { version: 0, relevance: 0.5 },
  gebouw: { version: 0, relevance: 0.5 },
  inrichtingselement: { version: 0, relevance: 0.5 },
  spoorbaandeel: { version: 0, relevance: 0.5 },
  waterdeel: { version: 0, relevance: 0.5 },
  wegdeel: { version: 0, relevance: 0.5 },
};

/** Doorzoekt de PDOK Locatieserver rechtstreeks vanuit de browser. */
export const PDOKSearchProvider: SearchProvider<Feature<Point, PDOKObject>> & {
  defaultCollections: Readonly<Partial<PDOKSearchCollections>>;
} = {
  search: async (query: string, params?: GazetteerPDOKSearchParams) => {
    if (query.trim().length < 2) {
      return [];
    }
    const {
      countrycodes: _countrycodes,
      bbox,
      collections,
      ...restParams
    } = params || {};

    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    try {
      const data = await $fetch<FeatureCollection<Point, PDOKObject>>(
        "https://api.pdok.nl/kadaster/location-api/v1/search",
        {
          query: {
            q: query,
            crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
            ...(bbox
              ? {
                  bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
                  "bbox-crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
                }
              : {}),
            limit: 20,
            ...restParams,
            ...flattenCollections(collections),
          },
          signal: abortController.signal,
        },
      );
      return data.features.map((entry) => convertToSearchResult(entry));
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.warn("Error with fetching search results: ", err);
      }
      return [];
    }
  },
  get defaultCollections() {
    return JSON.parse(
      JSON.stringify(defaultCollections),
    ) as Partial<PDOKSearchCollections>;
  },
};
