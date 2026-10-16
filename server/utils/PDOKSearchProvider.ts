import { Feature, FeatureCollection, Point } from "geojson";
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

export type GazetteerPDOKSearchParams = {
  q: string;
  limit?: number;
  crs: string;
} & Partial<PDOKSearchCollections>;

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
  const [lon, lat] = center(feature).geometry.coordinates;
  return {
    id: `${feature.id}`,
    label: feature.properties.display_name,
    labelHtml: SanitizedHTML.from(feature.properties.highlight),
    type: feature.properties.collection_id,
    lat,
    lon,
    boundingbox,
    raw: feature as SearchResultRaw,
  };
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

export const PDOKSearchProvider: SearchProvider<Feature<Point, PDOKObject>> & {
  defaultCollections: Readonly<Partial<PDOKSearchCollections>>;
} = {
  search: async (query: string, params?: GazetteerSearchParams) => {
    if (query.trim().length < 2) {
      return [];
    }
    const { countrycodes: _, bbox, collections, ...restParams } = params || {};

    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();

    try {
      // bbox must be comma-separated for PDOK API (cannot use axios params encoding)
      const bboxStr = bbox
        ? `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
        : undefined;
      const url = bboxStr
        ? `https://api.pdok.nl/kadaster/location-api/v1/search?bbox=${bboxStr}`
        : "https://api.pdok.nl/kadaster/location-api/v1/search?";
      const { data } = await axios.get<FeatureCollection<Point, PDOKObject>>(
        url,
        {
          params: {
            q: query,
            crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
            ...(bboxStr
              ? { "bbox-crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84" }
              : {}),
            limit: 20,
            ...restParams,
            // Flatten collections into top-level params (plaats[version]=1, not collections[plaats][version]=1)
            ...(collections || {}),
          },
          signal: abortController.signal,
        },
      );
      return data.features.map((entry: Feature<Point, PDOKObject>) =>
        convertToSearchResult(entry),
      );
    } catch (err) {
      if ((err as any).name !== "CanceledError") {
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
