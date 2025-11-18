import type { MapIssue } from "~/types/Issue";
import toBbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import type { BBox } from "geojson";
import { fromLonLat, toLonLat } from "ol/proj";
import type { Map, Map as OLMap } from "ol";
import type { Size } from "ol/size";

/**
 * Calculate bounding box from center coordinates and zoom level
 * Uses Web Mercator projection (same as OpenLayers)
 */
function calculateBboxFromCenter(
  centerLon: number,
  centerLat: number,
  zoomLevel: number,
  viewportWidth: number,
  viewportHeight: number
): BBox {
  // Convert center to Web Mercator
  const centerMercator = fromLonLat([centerLon, centerLat]);

  // Calculate extent width in meters at this zoom level
  // At zoom 0: 40075016.686m (Earth's circumference)
  // Each zoom level doubles the resolution
  const EARTH_CIRCUMFERENCE = 40075016.686;
  const metersPerPixel = EARTH_CIRCUMFERENCE / (256 * Math.pow(2, zoomLevel));

  const extentWidth = viewportWidth * metersPerPixel;
  const extentHeight = viewportHeight * metersPerPixel;

  // Create extent in Web Mercator [minX, minY, maxX, maxY]
  const extent = [
    centerMercator[0]! - extentWidth / 2,
    centerMercator[1]! - extentHeight / 2,
    centerMercator[0]! + extentWidth / 2,
    centerMercator[1]! + extentHeight / 2,
  ] as [number, number, number, number];

  // Convert corners back to lat/lon
  const minCorner = toLonLat([extent[0]!, extent[1]!]);
  const maxCorner = toLonLat([extent[2]!, extent[3]!]);

  return [minCorner[0]!, minCorner[1]!, maxCorner[0]!, maxCorner[1]!];
}

/**
 * Get viewport dimensions from the map or window
 */
function getViewportDimensions(olMap: OLMap): [number, number] {
  const size = olMap.getSize() as [number, number];
  return size;
}

export function transformBboxToOpenLayers(bbox: BBox): BBox {
  const [minX, minY, maxX, maxY] = bbox;
  // Convert to OpenLayers coordinates
  const min = fromLonLat([minX, minY]);
  const max = fromLonLat([maxX, maxY]);
  return [min[0]!, min[1]!, max[0]!, max[1]!];
}

/**
 * Extends the minimum bounding box to include the issues bounding box
 * @param issuesBbox - The bounding box of the issues
 * @param minBbox - The minimum bounding box [west, south, east, north]
 * @returns The extended bounding box that includes both areas
 */
function extendMinimumBbox(issuesBbox: BBox, minBbox: BBox): BBox {
  const [issuesWest, issuesSouth, issuesEast, issuesNorth] = issuesBbox;
  const [minWest, minSouth, minEast, minNorth] = minBbox;

  // Take the minimum west/south and maximum east/north to include both areas
  return [
    Math.min(issuesWest, minWest), // westmost point
    Math.min(issuesSouth, minSouth), // southmost point
    Math.max(issuesEast, minEast), // eastmost point
    Math.max(issuesNorth, minNorth), // northmost point
  ];
}

/**
 * Composable to calculate bounding box for a list of issues
 * Injects the map from vue3-openlayers to get actual viewport dimensions
 * Returns a function to calculate the extended bounding box in OpenLayers coordinates,
 * and optionally a computed property if issues are provided
 */
export function useIssuesBbox(
  issues: ComputedRef<MapIssue[]>,
  mapRef: Ref<{ map?: OLMap } | null | undefined>
) {
  const issuesBbox = computed(() => {
    if (!issues.value) return undefined;
    // Filter out issues without geometry
    const issuesWithGeometry = issues.value.filter((issue) => issue.geometry);
    if (issuesWithGeometry?.length === 0) return undefined;

    // Create a feature collection from the geometries
    const features = issuesWithGeometry.map((issue) => ({
      type: "Feature" as const,
      properties: {},
      geometry: issue.geometry,
    }));
    const collection = featureCollection(features);
    return toBbox(collection);
  });

  const { map } = useRuntimeConfig().public;

  // de minimum bbox volgens de config
  const minBbox = computed(() => {
    if (!mapRef.value?.map) return;
    const lon = parseFloat(map.centerLon);
    const lat = parseFloat(map.centerLat);
    const zoom = parseFloat(map.initialZoom);

    const [viewportWidth, viewportHeight] = mapRef.value.map.getSize() as [
      number,
      number
    ];
    return calculateBboxFromCenter(
      lon,
      lat,
      zoom,
      viewportWidth,
      viewportHeight
    );
  });

  const bbox = computed(() => {
    if (!minBbox.value) return undefined;
    const expandedBbox = issuesBbox.value
      ? extendMinimumBbox(issuesBbox.value, minBbox.value)
      : minBbox.value;
    return transformBboxToOpenLayers(expandedBbox);
  });

  return {
    bbox,
  };
}
