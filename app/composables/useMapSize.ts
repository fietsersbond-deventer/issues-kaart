import type { Map as OLMap } from "ol";

/**
 * Composable that makes the map size observable using ResizeObserver.
 * Uses useState for global shared state - same refs across all components.
 * The first call (within <ol-map>) sets up the ResizeObserver,
 * subsequent calls anywhere in the app get the same reactive refs.
 *
 * @returns Object with reactive mapHeight and mapWidth values
 */
export function useMapSize() {
  // Use global shared state - same refs across all components
  const mapHeight = useState('mapHeight', () => 0);
  const mapWidth = useState('mapWidth', () => 0);

  // Get the map instance via injection (only works inside <ol-map> component tree)
  const map = inject<OLMap | undefined>("map", undefined);

  let resizeObserver: ResizeObserver | null = null;

  // Setup resize observer on mount (only if we have a map instance)
  onMounted(() => {
    if (!map) {
      // This is fine - components outside <ol-map> can still read the shared state
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
          
          console.debug('[useMapSize] ResizeObserver update', {
            width: mapWidth.value,
            height: mapHeight.value,
          });
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
