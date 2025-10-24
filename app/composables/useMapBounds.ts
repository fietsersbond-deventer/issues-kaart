import { transformExtent } from "ol/proj";
import type { Ref } from "vue";
import type { Map } from "ol";

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
  bbox: [number, number, number, number];
}

/**
 * Composable to track map bounding box changes using template ref to ol-map component
 * @param mapRef - Template ref to the ol-map component
 */
export function useMapBounds(mapRef: Ref<unknown>) {
  onMounted(() => {
    watch(
      mapRef,
      (mapComponent) => {
        if (!mapComponent) return;

        const component = mapComponent as Record<string, unknown>;
        const olMap = component.map as Map;

        if (!olMap) {
          console.warn("OpenLayers Map not found in component");
          return;
        }

        const view = olMap.getView();

        if (!view) {
          console.warn("View not available from map");
          return;
        }

        // Add listener for view changes (pan, zoom, etc.)
        view.on(["change:center", "change:resolution"], () => {
          // Calculate current extent/bounding box
          const extent = view.calculateExtent(olMap.getSize());

          // Transform extent from map projection (EPSG:3857) to geographic coordinates (EPSG:4326)
          const geographicExtent = transformExtent(
            extent,
            "EPSG:3857",
            "EPSG:4326"
          );

          // Extract bounds: [minX, minY, maxX, maxY] -> [west, south, east, north]
          const [west, south, east, north] = geographicExtent;

          // Ensure all values are defined
          if (
            west === undefined ||
            south === undefined ||
            east === undefined ||
            north === undefined
          ) {
            console.warn("Invalid extent calculated");
            return;
          }

          // Create bounds object
          const bounds: MapBounds = {
            west,
            south,
            east,
            north,
            bbox: [west, south, east, north],
          };

          // Log the bounding box
          console.debug("Map bounding box:", bounds.bbox);
        });
      },
      { immediate: true }
    );
  });
}
