import proj4 from "proj4";

// Rijksdriehoeksstelsel (EPSG:28992), zie ook app/composables/useMapView.ts
const RD_PROJ4_DEF =
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs";

// Ruwe begrenzing van Nederland, ruim genoeg om coördinaten te herkennen.
const RD_BOUNDS = { minX: 0, maxX: 280000, minY: 300000, maxY: 625000 };
const WGS84_BOUNDS = { minLat: 50, maxLat: 54, minLon: 2, maxLon: 8 };

function parseCoordinatePair(value: string): [number, number] | undefined {
  const match = value
    .trim()
    .match(/^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return undefined;

  const a = parseFloat(match[1]!.replace(",", "."));
  const b = parseFloat(match[2]!.replace(",", "."));
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;

  return [a, b];
}

function toSearchResult(lon: number, lat: number): SearchResult {
  return {
    id: `coord-${lon}-${lat}`,
    label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    lat,
    lon,
    type: "coordinate",
  };
}

/**
 * Herkent of de zoekterm direct een coördinatenpaar is (WGS84 lat/lon of
 * Rijksdriehoek x/y) en levert dan meteen een resultaat, zonder de
 * zoekprovider aan te roepen.
 */
export function tryCoordinateProviders(
  value: string,
): SearchResult[] | undefined {
  const pair = parseCoordinatePair(value);
  if (!pair) return undefined;

  const [first, second] = pair;

  if (
    first >= WGS84_BOUNDS.minLat &&
    first <= WGS84_BOUNDS.maxLat &&
    second >= WGS84_BOUNDS.minLon &&
    second <= WGS84_BOUNDS.maxLon
  ) {
    return [toSearchResult(second, first)];
  }

  if (
    first >= RD_BOUNDS.minX &&
    first <= RD_BOUNDS.maxX &&
    second >= RD_BOUNDS.minY &&
    second <= RD_BOUNDS.maxY
  ) {
    proj4.defs("EPSG:28992", RD_PROJ4_DEF);
    const [lon, lat] = proj4("EPSG:28992", "EPSG:4326").forward([
      first,
      second,
    ]);
    return [toSearchResult(lon!, lat!)];
  }

  return undefined;
}
