import type { BBox, Feature, Polygon } from "geojson";

interface PhotonProperties {
  osm_type?: string;
  osm_id?: string;
  name?: string;
  type?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  extent?: [number, number, number, number];
  lat?: number;
  lon?: number;
}

interface NominatimResult {
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
  address_rank?: number;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    district?: string;
    [key: string]: string | undefined;
  };
}

export interface SearchResult {
  id: string;
  name: string;
  displayName: string;
  type: string;
  boundingBox: BBox;
  coordinates: [number, number];
  addressRank?: number; // Lower values are more important
  // Store raw result for more reliable deduplication
  raw?: NominatimResult;
}

export interface SearchProvider {
  search(query: string, signal?: AbortSignal): Promise<SearchResult[]>;
  getTitle(result: SearchResult): string;
}

/**
 * Photon search provider using komoot's photon API
 */
export class PhotonSearchProvider implements SearchProvider {
  private readonly baseUrl = "https://photon.komoot.io/api/";
  private readonly biasLat = "52.2511467"; // Deventer
  private readonly biasLon = "6.1574997"; // Deventer

  async search(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: "10",
      lat: this.biasLat,
      lon: this.biasLon,
      zoom: "14",
      location_bias_scale: "0.4",
    });

    const response = await fetch(
      `${this.baseUrl}?${params.toString()}&layer=street&layer=locality`,
      { signal }
    );

    const data = await response.json();
    const features: Feature<Polygon>[] = data.features.filter(
      (f: Feature<Polygon>) => !!f.properties?.extent
    );

    return features
      .map((feature) => {
        const props = feature.properties as PhotonProperties;
        if (!props?.extent) return null;

        const [west, north, east, south] = props.extent;
        const id =
          props.osm_type && props.osm_id
            ? `${props.osm_type}_${props.osm_id}`
            : `${props.name}_${props.type}`;

        return {
          id: id || "unknown",
          name: props.name || "Unknown",
          displayName:
            this.formatDisplayName(props) || props.name || "Unknown location",
          type: props.type || "",
          boundingBox: [west, south, east, north] as BBox,
          coordinates: [props.lon || 0, props.lat || 0] as [number, number],
        };
      })
      .filter((result): result is SearchResult => result !== null);
  }

  getTitle(result: SearchResult): string {
    // Extract more context from the original displayName for better metadata
    if (!result.displayName) {
      return result.name || "Onbekende locatie";
    }

    const parts = result.displayName.split("\n");
    const mainPart = parts[0] || result.name;
    const metaPart = parts[1] || "";

    return `${mainPart}
    ${metaPart}`;
  }

  private formatDisplayName(props: PhotonProperties): string {
    const name = props.name || "Unknown";
    const street = props.street || "";
    const housenumber = props.housenumber || "";
    const type = props.type || "";
    const postcode = props.postcode || "";
    const city = props.city || "";

    return `${name} ${street} ${housenumber} 
    <i>
    ${type === "street" ? `${postcode} ${city}` : type}
</i>
`;
  }
}

/**
 * Nominatim search provider using OpenStreetMap's Nominatim API
 */
export class NominatimSearchProvider implements SearchProvider {
  private readonly baseUrl = "https://nominatim.openstreetmap.org/search";
  private readonly biasLat = "52.2511467"; // Deventer
  private readonly biasLon = "6.1574997"; // Deventer

  async search(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "20",
      addressdetails: "1",
      bounded: "1",
      viewbox: "6.0,52.1,6.3,52.4", // Focused area around Deventer
      lat: this.biasLat,
      lon: this.biasLon,
      countrycodes: "nl", // Restrict to Netherlands
      "accept-language": "nl,en", // Prefer Dutch, fallback to English
      extratags: "1", // Include additional tags for better context
    });

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      signal,
    });

    const data = await response.json();

    return data
      .filter(
        (item: NominatimResult) =>
          item.boundingbox && item.boundingbox.length === 4
      )
      .map((item: NominatimResult) => {
        const [south, north, west, east] = item.boundingbox.map(Number);
        const id =
          item.osm_type && item.osm_id
            ? `${item.osm_type}_${item.osm_id}`
            : item.place_id;

        return {
          id: id || "unknown",
          name: item.name || item.display_name.split(",")[0] || "Unknown",
          displayName: item.display_name || "Unknown location",
          type: item.type || item.class || "",
          boundingBox: [west, south, east, north] as BBox,
          coordinates: [Number(item.lon), Number(item.lat)] as [number, number],
          addressRank: item.address_rank,
          raw: item, // Include raw result for better deduplication
        };
      });
  }

  getTitle(result: SearchResult): string {
    // Show the location hierarchy from display_name
    if (!result.displayName) {
      return result.name || "Onbekende locatie";
    }

    const locationParts = result.displayName.split(",");
    const name = locationParts[0]?.trim() || result.name;
    const context = locationParts
      .slice(1, 4)
      .map((part) => part.trim())
      .join(", ");

    // Translate common English types to Dutch for better UX
    const dutchType = this.translateType(result.type);

    // Only show type if it's not empty/unclassified
    const typeDisplay = dutchType ? `${dutchType} • ` : "";

    return `${name}
    <i>
    ${typeDisplay}${context}
    </i>`;
  }

  private translateType(type: string): string {
    const translations: Record<string, string> = {
      street: "straat",
      square: "plein",
      road: "weg",
      avenue: "laan",
      park: "park",
      building: "gebouw",
      house: "huis",
      shop: "winkel",
      restaurant: "restaurant",
      school: "school",
      hospital: "ziekenhuis",
      church: "kerk",
      museum: "museum",
      library: "bibliotheek",
      station: "station",
      stop: "halte",
      suburb: "wijk",
      neighbourhood: "buurt",
      city: "stad",
      town: "plaats",
      village: "dorp",
      unclassified: "",
      residential: "woonwijk",
    };

    return translations[type.toLowerCase()] || type;
  }
}

/**
 * Composable for location search functionality
 */
export function useLocationSearch(
  provider: SearchProvider = new PhotonSearchProvider()
) {
  const isSearching = ref(false);
  let currentController: AbortController | null = null;

  async function search(query: string): Promise<SearchResult[]> {
    // Abort previous request if it exists
    if (currentController) {
      currentController.abort();
    }

    isSearching.value = true;
    currentController = new AbortController();

    try {
      const results = await provider.search(query, currentController.signal);

      // Enhanced duplicate removal for streets and places
      return removeDuplicates(results);
    } catch (error: unknown) {
      // If the error is due to abort, we don't need to do anything
      if (error instanceof Error && error.name === "AbortError") {
        return [];
      }
      console.error("Search error:", error);
      return [];
    } finally {
      isSearching.value = false;
    }
  }

  return {
    search,
    isSearching: readonly(isSearching),
  };
}

/**
 * Simple duplicate removal using Nominatim address object for reliable deduplication
 */
function removeDuplicates(results: SearchResult[]): SearchResult[] {
  if (results.length <= 1) return results;

  // Group results by location key based on address components
  const locationGroups = new Map<string, SearchResult[]>();

  results.forEach((result) => {
    const key = createAddressKey(result);
    const existing = locationGroups.get(key) || [];
    existing.push(result);
    locationGroups.set(key, existing);
  });

  const finalResults: SearchResult[] = [];

  // For each location group, keep only the best result(s)
  locationGroups.forEach((group) => {
    if (group.length === 1) {
      finalResults.push(group[0]!);
    } else {
      // Multiple results for the same location - keep the best one
      const best = selectBestResult(group);
      finalResults.push(best);
    }
  });

  // Sort results by proximity to Deventer, then by preference
  return finalResults
    .sort((a, b) => {
      // First priority: distance to Deventer (closer is better)
      const deventerCoords = [6.1574997, 52.2511467]; // Deventer coordinates
      const aDistance = calculateDistance(a.coordinates, deventerCoords);
      const bDistance = calculateDistance(b.coordinates, deventerCoords);

      // If one result is significantly closer (>5km difference), prioritize it
      const distanceDiff = Math.abs(aDistance - bDistance);
      if (distanceDiff > 5) {
        return aDistance - bDistance; // Closer first
      }

      // Second priority: address_rank (lower is more important)
      const aRank = a.addressRank ?? 99; // Default to high rank if missing
      const bRank = b.addressRank ?? 99; // Default to high rank if missing
      if (aRank !== bRank) {
        return aRank - bRank; // Lower rank first
      }

      // Third priority: prefer squares/places over street segments
      const aIsPlace = a.type === "square" || a.type === "place";
      const bIsPlace = b.type === "square" || b.type === "place";

      if (aIsPlace && !bIsPlace) return -1;
      if (!aIsPlace && bIsPlace) return 1;

      // Fourth priority: if both same type and similar distance, prefer larger areas (more complete)
      const aArea = calculateBoundingBoxArea(a.boundingBox);
      const bArea = calculateBoundingBoxArea(b.boundingBox);
      return bArea - aArea;
    })
    .slice(0, 10); // Limit to maximum 10 results
}

/**
 * Create a location key using address components from Nominatim
 */
function createAddressKey(result: SearchResult): string {
  const address = result.raw?.address;
  if (!address) {
    // Fallback to name-based key if no address available
    return result.name.toLowerCase().trim();
  }

  // Use the most specific available address components
  const road = address.road?.toLowerCase().trim() || "";
  const city =
    (address.city || address.town || address.village || address.municipality)
      ?.toLowerCase()
      .trim() || "";

  // For streets, use road + city combination (ignore postcode for partial matching)
  if (road) {
    return `${road}|${city}`;
  }

  // For places/squares, use the name + city (ignore postcode for partial matching)
  const name = result.name.toLowerCase().trim();
  return `${name}|${city}`;
}

/**
 * Select the best result from a group of duplicates
 */
function selectBestResult(group: SearchResult[]): SearchResult {
  if (group.length === 0) {
    throw new Error("Cannot select best result from empty group");
  }

  // Sort by preference and take the first (best) one
  return group.sort((a, b) => {
    // Prefer places/squares over street segments
    const aIsPlace = a.type === "square" || a.type === "place";
    const bIsPlace = b.type === "square" || b.type === "place";

    if (aIsPlace && !bIsPlace) return -1;
    if (!aIsPlace && bIsPlace) return 1;

    // Prefer results with house numbers (more specific)
    const aHasNumber = /\d+/.test(a.displayName);
    const bHasNumber = /\d+/.test(b.displayName);

    if (aHasNumber && !bHasNumber) return -1;
    if (!aHasNumber && bHasNumber) return 1;

    // Prefer larger areas (more complete information)
    const aArea = calculateBoundingBoxArea(a.boundingBox);
    const bArea = calculateBoundingBoxArea(b.boundingBox);

    return bArea - aArea;
  })[0]!;
}

function calculateBoundingBoxArea(bbox: BBox): number {
  const [west, south, east, north] = bbox;
  return (east - west) * (north - south);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}
