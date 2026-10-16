import type { Map as OLMap } from "ol";
import type { Ref } from "vue";

/** Tracks the map container size; moving the view is up to useMapFocus. */
export function useMapResize(mapRef: Ref<{ map?: OLMap } | null | undefined>) {
  const mapHeight = ref(0);
  const mapWidth = ref(0);

  let resizeObserver: ResizeObserver | null = null;

  // Setup resize observer on mount
  onMounted(() => {
    nextTick(() => {
      const mapComponent = unref(mapRef);
      if (!mapComponent) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapContainer = (mapComponent as any).$el as HTMLElement;
      if (!mapContainer) return;

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          mapHeight.value = entry.contentRect.height;
          mapWidth.value = entry.contentRect.width;
        }

        mapRef.value?.map?.updateSize();
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
