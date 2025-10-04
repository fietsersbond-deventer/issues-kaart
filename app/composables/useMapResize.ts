import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { transform } from "ol/proj";
import centroid from "@turf/centroid";
import type { Geometry } from "geojson";

export function useMapResize(mapRef: Ref<{ map?: OLMap } | null | undefined>) {
  const { issue: selectedIssue } = storeToRefs(useSelectedIssue());
  const mapHeight = ref(0);
  const mapWidth = ref(0);
  const targetCenter = ref<number[] | null>(null);

  function recenterOnSelectedIssue() {
    if (!selectedIssue.value?.geometry) return;

    const geometry = selectedIssue.value.geometry as Geometry;

    // Use Turf to calculate the centroid
    const centerPoint = centroid(geometry);

    // Transform from EPSG:4326 (GeoJSON) to EPSG:3857 (map projection)
    const newCenter = transform(
      centerPoint.geometry.coordinates,
      "EPSG:4326",
      "EPSG:3857"
    );

    // Store the target center to trigger animation
    targetCenter.value = newCenter;
  }

  // Watch for target center changes and animate to it
  watch(targetCenter, (newTarget) => {
    if (!newTarget || !mapRef.value?.map) return;

    const view = mapRef.value.map.getView();
    view.animate({
      center: newTarget,
      duration: 300,
    });
  });

  // Setup resize observer on mount
  onMounted(() => {
    nextTick(() => {
      const mapComponent = unref(mapRef);
      if (!mapComponent) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapContainer = (mapComponent as any).$el as HTMLElement;
      if (!mapContainer) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          mapHeight.value = entry.contentRect.height;
          mapWidth.value = entry.contentRect.width;
        }

        if (mapRef.value?.map) {
          mapRef.value.map.updateSize();

          if (selectedIssue.value?.geometry) {
            recenterOnSelectedIssue();
          }
        }
      });

      resizeObserver.observe(mapContainer);

      onUnmounted(() => {
        resizeObserver.disconnect();
      });
    });
  });

  return {
    mapHeight,
    mapWidth,
    recenterOnSelectedIssue,
  };
}
