import type { Map as OLMap } from "ol";

/**
 * Composable that makes the map size observable using ResizeObserver.
 * Uses injection to get the OL map instance - no mapRef parameter needed.
 *
 * @returns Object with reactive mapHeight and mapWidth values
 */
export function useMapSize() {
  const map = inject<OLMap>("map");

  const mapHeight = ref(0);
  const mapWidth = ref(0);

  let resizeObserver: ResizeObserver | null = null;

  // Setup resize observer on mount
  onMounted(() => {
    if (!map) {
      console.warn("useMapSize: No map instance found via injection");
      return;
    }

    nextTick(() => {
      const mapContainer = map.getTargetElement();
      if (!mapContainer) {
        console.warn("useMapSize: No map container element found");
        return;
      }

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          mapHeight.value = entry.contentRect.height;
          mapWidth.value = entry.contentRect.width;
        }

        map.updateSize();
      });

      resizeObserver.observe(mapContainer);
    });
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  return {
    mapHeight,
    mapWidth,
  };
}
